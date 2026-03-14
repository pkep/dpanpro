export interface IStorageService {
  uploadFile(bucket: string, file: File, folder?: string): Promise<string>;
  uploadFiles(bucket: string, files: File[], folder?: string): Promise<string[]>;
  deleteFile(bucket: string, fileUrl: string): Promise<void>;
}
