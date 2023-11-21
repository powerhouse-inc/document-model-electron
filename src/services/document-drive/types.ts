import {
    AddFolderInput,
    DocumentDriveDocument,
    DocumentDriveState,
    FileNode,
    FolderNode,
    Node,
} from 'document-model-libs/document-drive';
import { Document, ExtendedState, Operation } from 'document-model/document';

export type DriveInput = Omit<
    DocumentDriveState,
    '__typename' | 'remoteUrl' | 'nodes'
>;

export type CreateDocumentInput<S = unknown> = {
    name: string;
    documentType: string;
    parentFolder?: string;
    initialState?: ExtendedState<S>;
};

export interface SortOptions {
    afterNodePath?: string;
}

export interface IDocumentDriveServer {
    addDrive(drive: DriveInput): Promise<void>;
    deleteDrive(id: string): Promise<void>;
    getDrive(drive: string): Promise<DocumentDriveDocument>;
    addFolder(drive: string, folder: AddFolderInput): Promise<FolderNode>;
    deleteFolder(drive: string, id: string): Promise<void>;
    renameNode(drive: string, id: string, name: string): Promise<Node>;
    copyOrMoveNode(
        drive: string,
        srcPath: string,
        destPath: string,
        operation: string,
        sort?: SortOptions
    ): Promise<void>;
    getDocument: (drive: string, id: string) => Promise<Document>;
    createDocument(
        drive: string,
        document: CreateDocumentInput
    ): Promise<FileNode>;
    deleteDocument(drive: string, id: string): Promise<void>;
    addOperation(
        drive: string,
        id: string,
        operation: Operation
    ): Promise<Document>;
}

export interface IStorage {
    getDocument(drive: string, id: string): Promise<Document>;
    saveDocument(drive: string, id: string, document: Document): Promise<void>;
    deleteDocument(drive: string, id: string): Promise<void>;
}

export interface IDriveStorage extends IStorage {
    getDrives(): Promise<DocumentDriveDocument[]>;
    getDrive(id: string): Promise<DocumentDriveDocument>;
    saveDrive(drive: DocumentDriveDocument): Promise<void>;
    deleteDrive(id: string): Promise<void>;
}

export { initElectronDocumentDrive } from './electron-document-drive';
