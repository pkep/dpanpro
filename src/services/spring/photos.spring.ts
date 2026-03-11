import type { IPhotosService } from '@/services/interfaces/photos.interface';
import { springHttp } from './http-client';

export class SpringPhotosService implements IPhotosService {
  // POST /interventions/{id}/photos (multipart)
  async uploadPhoto(interventionId: string, file: File): Promise<string> {
    const urls = await this.uploadPhotos(interventionId, [file]);
    return urls[0];
  }

  async uploadPhotos(interventionId: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return springHttp.upload<string[]>(`/interventions/${interventionId}/photos`, formData);
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    // Storage: DELETE /storage/{fileKey}
    const fileKey = encodeURIComponent(photoUrl);
    await springHttp.delete(`/storage/${fileKey}`);
  }

  async updateInterventionPhotos(interventionId: string, photos: string[]): Promise<void> {
    await springHttp.patch(`/interventions/${interventionId}`, { photos });
  }

  async getInterventionPhotos(interventionId: string): Promise<string[]> {
    const intervention = await springHttp.get<{ photos: string[] | null }>(`/interventions/${interventionId}`);
    return intervention.photos || [];
  }
}
