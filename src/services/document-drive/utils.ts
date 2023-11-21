import {
    DocumentDriveDocument,
    documentModel as DocumentDriveModel,
    z,
} from 'document-model-libs/document-drive';
import { Document } from 'document-model/document';

export function isDocumentDrive(
    document: Document
): document is DocumentDriveDocument {
    return (
        document.documentType === DocumentDriveModel.id &&
        z.DocumentDriveStateSchema().safeParse(document.state).success
    );
}
