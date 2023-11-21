import { DocumentDriveDocument } from 'document-model-libs/document-drive';
import { Document } from 'document-model/document';
import { IDriveStorage } from '../types';

function buildKey(drive: string, id: string) {
    return `${drive}/${id}`;
}

export class MemoryStorage implements IDriveStorage {
    private documents: Record<string, Document>;
    private drives: Record<string, DocumentDriveDocument>;

    constructor() {
        this.documents = {};
        this.drives = {};
    }

    async getDocument(drive: string, id: string) {
        const document = this.documents[`${drive}/${id}`];
        if (!document) {
            throw new Error(`Document with id ${id} not found`);
        }
        return document;
    }

    async saveDocument(drive: string, id: string, document: Document) {
        this.documents[buildKey(drive, id)] = document;
    }

    async deleteDocument(drive: string, id: string) {
        delete this.documents[buildKey(drive, id)];
    }

    async getDrives() {
        return Object.values(this.drives);
    }

    async getDrive(id: string) {
        const drive = this.drives[id];
        if (!drive) {
            throw new Error(`Drive with id ${id} not found`);
        }
        return drive;
    }

    async saveDrive(drive: DocumentDriveDocument) {
        this.drives[drive.state.id] = drive;
    }

    async deleteDrive(id: string) {
        delete this.drives[id];
    }
}
