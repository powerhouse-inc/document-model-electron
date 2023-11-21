import { DocumentDriveDocument } from 'document-model-libs/document-drive';
import { Document } from 'document-model/document';
import fs from 'fs/promises';

import path from 'path';
import sanitize from 'sanitize-filename';
import { IDriveStorage } from '../types';
import { isDocumentDrive } from '../utils';

export class FilesystemStorage implements IDriveStorage {
    private basePath: string;
    private static DRIVES_DIR = 'drives';

    constructor(basePath: string) {
        this.basePath = basePath;
    }

    private _buildPath(drive: string, id: string) {
        return `${path.join(
            this.basePath,
            sanitize(drive),
            sanitize(id)
        )}.json`;
    }

    async getDocument(drive: string, id: string) {
        const content = await fs.readFile(this._buildPath(drive, id));
        if (!content) {
            throw new Error(`Document with id ${id} not found`);
        }
        return JSON.parse(content.toString());
    }

    async saveDocument(drive: string, id: string, document: Document) {
        return fs.writeFile(
            this._buildPath(drive, id),
            JSON.stringify(document)
        );
    }

    async deleteDocument(drive: string, id: string) {
        fs.rm(this._buildPath(drive, id));
    }

    async getDrives(): Promise<DocumentDriveDocument[]> {
        const files = await fs.readdir(FilesystemStorage.DRIVES_DIR);
        const drives: DocumentDriveDocument[] = [];
        for (const file of files) {
            try {
                const drive = await this.getDrive(file);
                drives.push(drive);
            } catch {
                /* Invalid drive document found on drives dir */
            }
        }
        return drives;
    }

    async getDrive(id: string) {
        let document: Document;
        try {
            document = await this.getDocument(id, '');
        } catch {
            throw new Error(`Drive with id ${id} not found`);
        }
        if (isDocumentDrive(document)) {
            return document;
        } else {
            throw new Error('Invalid drive document');
        }
    }

    saveDrive(drive: DocumentDriveDocument) {
        return this.saveDocument('drives', drive.state.id, drive);
    }

    deleteDrive(id: string) {
        return this.deleteDocument('drives', id);
    }
}
