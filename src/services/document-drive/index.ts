import {
    AddFolderInput,
    DocumentDriveDocument,
    FileNode,
    Node,
    actions,
    isFileNode,
    isFolderNode,
    reducer,
    utils,
} from 'document-model-libs/document-drive';
import {
    Document,
    DocumentModel,
    Operation,
    utils as baseUtils,
} from 'document-model/document';
import { MemoryStorage } from './storage/memory';
import {
    CreateDocumentInput,
    DriveInput,
    IDocumentDriveServer,
    IStorage,
    SortOptions,
} from './types';
import { isDocumentDrive } from './utils';

export * from './types';

export { initElectronDocumentDrive } from './electron-document-drive';

export class DocumentDriveServer implements IDocumentDriveServer {
    private documentModels: DocumentModel[];
    private storage: IStorage;

    constructor(
        documentModels: DocumentModel[],
        storage: IStorage = new MemoryStorage()
    ) {
        this.documentModels = documentModels;
        this.storage = storage;
    }

    private _getDocumentModel(documentType: string) {
        const documentModel = this.documentModels.find(
            model => model.documentModel.id === documentType
        );
        if (!documentModel) {
            throw new Error(`Document type ${documentType} not supported`);
        }
        return documentModel;
    }

    private async _saveDrive(drive: DocumentDriveDocument) {
        return this.storage.saveDocument(drive.state.id, '', drive);
    }

    async addDrive(drive: DriveInput) {
        const document = utils.createDocument({ state: drive });
        return this._saveDrive(document);
    }

    async deleteDrive(id: string) {
        return this.storage.deleteDocument(id, '');
    }

    async getDrive(drive: string) {
        const document = await this.storage.getDocument(drive, '');
        if (isDocumentDrive(document)) {
            return document;
        } else {
            throw new Error('Document is not a Document Drive');
        }
    }

    async addFolder(driveId: string, folder: AddFolderInput) {
        let drive = await this.getDrive(driveId);
        drive = reducer(drive, actions.addFolder(folder));
        await this._saveDrive(drive);

        const node = drive.state.nodes.find(node => node.id === folder.id);
        if (!node || !isFolderNode(node)) {
            throw new Error('Error adding folder');
        }
        return node;
    }

    async deleteFolder(driveId: string, id: string) {
        let drive = await this.getDrive(driveId);
        drive = reducer(drive, actions.deleteNode({ id }));
        await this._saveDrive(drive);
    }

    async renameNode(driveId: string, id: string, name: string): Promise<Node> {
        let drive = await this.getDrive(driveId);
        drive = reducer(drive, actions.updateNode({ id, name }));
        await this._saveDrive(drive);
        const node = drive.state.nodes.find(node => node.id === id);
        if (!node) {
            throw new Error(`Error renaming node ${id}`);
        }
        return node;
    }

    copyOrMoveNode(
        drive: string,
        srcPath: string,
        destPath: string,
        operation: string,
        sort?: SortOptions | undefined
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    async getDocument(drive: string, id: string) {
        return this.storage.getDocument(drive, id);
    }

    async createDocument(
        driveId: string,
        input: CreateDocumentInput<unknown>
    ): Promise<FileNode> {
        let drive = await this.getDrive(driveId);

        const documentModel = this._getDocumentModel(input.documentType);
        const id = baseUtils.hashKey();
        drive = reducer(
            drive,
            actions.addFile({
                name: input.name,
                documentType: input.documentType,
                parentFolder: input.parentFolder,
                id,
            })
        );
        const document = documentModel.utils.createDocument({
            state: input.initialState,
        });

        await this.storage.saveDocument(driveId, id, document);
        await this._saveDrive(drive);

        const node = drive.state.nodes.find(node => node.id === id);
        if (!node || !isFileNode(node)) {
            throw new Error('Error adding file');
        }
        return node;
    }

    async deleteDocument(driveId: string, id: string): Promise<void> {
        let drive = await this.getDrive(driveId);
        drive = reducer(drive, actions.deleteNode({ id }));
        await this.storage.deleteDocument(driveId, id);
        await this._saveDrive(drive);
    }

    async addOperation(
        drive: string,
        id: string,
        operation: Operation
    ): Promise<Document> {
        // retrieves document from storage
        const document = await this.storage.getDocument(drive, id);

        // retrieves the document's document model and
        // applies operation using its reducer
        const documentModel = this._getDocumentModel(document.documentType);
        const newDocument = documentModel.reducer(document, operation);

        // saves the updated state of the document and returns it
        await this.storage.saveDocument(drive, id, newDocument);
        return newDocument;
    }
}
