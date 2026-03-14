import type { IStorageService } from '@/services/interfaces/storage.interface';
import { springHttp } from './http-client';

export class SpringStorageService implements IStorageService {
  // POST /storage/upload (multipart/form-data)
  async uploadFile(bucket: string, file: File, folder?: string): Promise<string> {
    const formData = new FormData();
    formData.append('bucket', bucket);
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const result = await springHttp.upload<{ url: string }>('/storage/upload', formData);
    return result.url;
  }

  async uploadFiles(bucket: string, files: File[], folder?: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(bucket, file, folder));
    return Promise.all(uploadPromises);
  }

  // DELETE /storage/{fileKey}
  async deleteFile(_bucket: string, fileUrl: string): Promise<void> {
    const fileKey = encodeURIComponent(fileUrl);
    await springHttp.delete(`/storage/${fileKey}`);
  }
}
