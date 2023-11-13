import {
    AddDriveInput,
    AddFileInput,
    AddFolderInput,
    DocumentDrive,
    DocumentDriveAction,
    DocumentDriveState,
    utils as DriveUtils,
    Node,
    UpdateFileInput,
    isFileNode,
    isFolderNode,
} from 'document-model-libs/document-drive';
import {
    Action,
    Document,
    ExtendedState,
    utils as baseUtils,
} from 'document-model/document';
import ElectronStore from 'electron-store';
import fsExtra from 'fs-extra';
import fs from 'fs/promises';
import path from 'path';
import { IDocumentDrive } from '.';

interface IElectronDocumentDriveSerialized {
    basePath: string;
    document: Document<DocumentDriveState, DocumentDriveAction>;
}

class ElectronDocumentDrive implements IDocumentDrive {
    private store: ElectronStore;
    private basePath: string;
    private document: DocumentDrive;

    static DOCUMENT_DRIVE_KEY = 'DOCUMENT_DRIVE';

    constructor(
        store: ElectronStore,
        basePath: string,
        initialState?:
            | Partial<ExtendedState<Partial<DocumentDriveState>>>
            | undefined
    ) {
        this.store = store;
        this.document = new DocumentDrive(initialState);
        this.basePath = basePath;
    }

    async getDocument() {
        return this.document.toDocument();
    }

    private getPath(driveId: string, ...paths: string[]) {
        return path.join(this.basePath, driveId, ...paths);
    }

    getDrive(id: string) {
        return this.document.state.drives.find(drive => drive.id === id);
    }

    getNode(driveId: string, path: string) {
        const drive = this.getDrive(driveId);
        return drive?.nodes.find(n => n.path === path);
    }

    save() {
        this.store.set(
            ElectronDocumentDrive.DOCUMENT_DRIVE_KEY,
            this.serialize()
        );
    }

    serialize() {
        return JSON.stringify({
            basePath: this.basePath,
            document: this.document.toDocument() as Document<
                DocumentDriveState,
                DocumentDriveAction
            >,
        } satisfies IElectronDocumentDriveSerialized);
    }

    static deserialize(input: string, store: ElectronStore) {
        try {
            const { basePath, document } = JSON.parse(
                input
            ) as IElectronDocumentDriveSerialized;
            return new ElectronDocumentDrive(
                store,
                basePath,
                document // TODO
            );
        } catch (error) {
            return undefined;
        }
    }

    static load(store: ElectronStore) {
        const result = store.get(
            ElectronDocumentDrive.DOCUMENT_DRIVE_KEY
        ) as string;
        if (!result) {
            return undefined;
        }
        return this.deserialize(result, store);
    }

    private async saveFile(driveId: string, path: string, document: Document) {
        return fs.writeFile(
            this.getPath(driveId, path),
            JSON.stringify(document),
            {
                encoding: 'binary',
            }
        );
    }

    private async deleteFile(driveId: string, path: string) {
        return fs.rm(this.getPath(driveId, path), { recursive: true });
    }

    private async copyOrMoveNodeFs(
        driveId: string,
        srcPath: string,
        destPath: string,
        operation: string
    ) {
        const srcNode = this.getNode(driveId, srcPath);
        if (!srcNode) {
            throw new Error(
                `Node with path ${srcPath} not found on drive ${driveId}`
            );
        }

        const destNode = this.getNode(driveId, destPath);
        if (!destNode) {
            throw new Error(
                `Node with path ${destPath} not found on drive ${driveId}`
            );
        }

        const srcFullPath = this.getPath(driveId, srcPath);
        const destFullPath = this.getPath(driveId, destPath);
        const newPath = path.join(destFullPath, path.basename(srcFullPath));

        if (operation === 'copy') {
            await fsExtra.emptyDir(newPath);
            return await fsExtra.copy(srcFullPath, newPath);
        }

        return await fsExtra.move(srcFullPath, newPath);
    }

    async addFolder(input: AddFolderInput) {
        await fs.mkdir(this.getPath(input.drive, input.path, ''));
        this.document.addFolder(input);
        this.save();

        const node = this.getNode(input.drive, input.path);
        if (!node || !isFolderNode(node)) {
            throw new Error('Error adding folder');
        }

        return node;
    }

    async addFile(input: AddFileInput, document: Document) {
        await this.saveFile(input.drive, input.path, document);
        this.document.addFile(input);

        const node = this.getNode(input.drive, input.path);
        if (!node || !isFileNode(node)) {
            throw new Error('Error adding file');
        }

        this.save();
        return node;
    }

    async updateFile(input: UpdateFileInput, document: Document) {
        await this.saveFile(input.drive, input.path, document);
        this.document.updateFile(input);
    }

    async deleteNode(drive: string, path: string) {
        await this.deleteFile(drive, path);
        this.document.deleteNode({ drive, path });
        this.save();
    }

    async renameNode(drive: string, path: string, name: string) {
        const node = this.getNode(drive, path);
        if (!node) {
            throw new Error(
                `Node with path ${path} not found on drive ${drive}`
            );
        }

        this.document.updateNode({ drive, path, name });
        this.save();

        const updatedNode = this.getNode(drive, path);
        if (!updatedNode) {
            throw new Error(
                `Error renaming node with path ${path} on drive ${drive}`
            );
        }
        return updatedNode;
    }

    async copyOrMoveNode(
        drive: string,
        srcPath: string,
        destPath: string,
        operation: string
    ): Promise<void> {
        const newBasePath = path.join(destPath, path.basename(srcPath));

        if (srcPath === newBasePath) {
            console.error('Cannot copy or move a node to itself');
            return;
        }

        const driveDocument = this.document.state.drives.find(
            d => d.id === drive
        );

        if (!driveDocument) {
            console.error('Drive not found');
            return;
        }

        if (operation === 'move' && destPath.startsWith(srcPath)) {
            console.error('Cannot move a node to a child node');
            return;
        }

        await this.copyOrMoveNodeFs(drive, srcPath, destPath, operation);

        let mutatedNodes: Array<Node> = [];

        if (operation === 'move') {
            mutatedNodes = driveDocument.nodes.map<Node>(node => {
                if (node.path.startsWith(srcPath)) {
                    return {
                        ...node,
                        path: path.normalize(
                            node.path.replace(srcPath, newBasePath)
                        ),
                    };
                }
                return node;
            });
        } else {
            // Copied nodes
            mutatedNodes = driveDocument.nodes.reduce((acc, node) => {
                if (node.path.startsWith(srcPath)) {
                    const copiedNode = {
                        ...node,
                        path: path.normalize(
                            node.path.replace(srcPath, newBasePath)
                        ),
                    };
                    return [...acc, { ...node }, copiedNode];
                }
                return [...acc, { ...node }];
            }, [] as Array<Node>);
        }

        // Update drive document
        this.document.updateDrive({
            id: driveDocument.id,
            hash: driveDocument.hash,
            name: driveDocument.name,
            nodes: mutatedNodes,
        });

        this.save();
        return;
    }

    async openFile<S = unknown, A extends Action = Action>(
        drive: string,
        path: string
    ) {
        const file = this.getNode(drive, path);
        if (!file) {
            throw new Error(
                `Node with path ${path} not found on drive ${drive}`
            );
        }
        if (!DriveUtils.isFileNode(file)) {
            throw new Error(
                `Node with path ${path} on drive ${drive} is not a file`
            );
        }
        const content = await fs.readFile(this.getPath(drive, file.path), {
            encoding: 'binary',
        });
        return JSON.parse(content.toString()) as Document<S, A>;
    }

    async addDrive(input: AddDriveInput) {
        await fs.mkdir(this.getPath(input.id));
        this.document.addDrive(input);
        this.save();
    }
}

export const initElectronDocumentDrive = async (
    store: ElectronStore,
    path: string
) => {
    let documentDrive = ElectronDocumentDrive.load(store);

    if (!documentDrive) {
        console.log('Creating document drive at ', path);
        documentDrive = new ElectronDocumentDrive(store, path, {
            name: 'My Local Drives',
        });
        documentDrive.save();
    }

    const document = await documentDrive.getDocument();

    if (!document.state.drives.length) {
        documentDrive.addDrive({
            id: baseUtils.hashKey(),
            name: 'Local Device',
            hash: '',
            nodes: [],
        });
    }
    return documentDrive;
};