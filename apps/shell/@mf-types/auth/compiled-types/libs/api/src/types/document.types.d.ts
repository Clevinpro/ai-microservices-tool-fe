export interface IDocument {
  id: string;
  title: string;
  createdAt: string;
}
export interface IUploadResponse {
  documentId: string;
  chunksCount: number;
}
