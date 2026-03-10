import type { IPhotosService } from '@/services/interfaces/photos.interface';
import { springHttp } from './http-client';

export class SpringPhotosService implements IPhotosService {
  async uploadPhoto(interventionId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const result = await springHttp.upload<{ url: string }>(`/photos/${interventionId}`, formData);
    return result.url;
  }
  async uploadPhotos(interventionId: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const result = await springHttp.upload<{ urls: string[] }>(`/photos/${interventionId}/batch`, formData);
    return result.urls;
  }
  async deletePhoto(photoUrl: string): Promise<void> {
    await springHttp.post('/photos/delete', { photoUrl });
  }
  async updateInterventionPhotos(interventionId: string, photos: string[]): Promise<void> {
    await springHttp.put(`/photos/${interventionId}`, { photos });
  }
  async getInterventionPhotos(interventionId: string): Promise<string[]> {
    return springHttp.get(`/photos/${interventionId}`);
  }
}
