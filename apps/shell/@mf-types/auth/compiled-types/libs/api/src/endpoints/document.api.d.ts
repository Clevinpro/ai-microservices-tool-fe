import type { IDocument, IUploadResponse } from '../types/document.types';
export declare function uploadDocument(file: File, title: string): Promise<IUploadResponse>;
export declare function getDocuments(): Promise<IDocument[]>;
