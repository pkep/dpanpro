import type { IWorkPhotosService } from '@/services/interfaces/work-photos.interface';
import type { WorkPhoto, WorkPhotoType } from '@/services/work-photos/work-photos.service';
import { springHttp } from './http-client';

export class SpringWorkPhotosService implements IWorkPhotosService {
  async uploadPhotos(interventionId: string, files: File[], photoType: WorkPhotoType, uploadedBy: string, description?: string): Promise<WorkPhoto[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('photoType', photoType);
    formData.append('uploadedBy', uploadedBy);
    if (description) formData.append('description', description);
    return springHttp.upload(`/work-photos/${interventionId}`, formData);
  }
  async getPhotos(interventionId: string, photoType?: WorkPhotoType): Promise<WorkPhoto[]> {
    const params: Record<string, string> = {};
    if (photoType) params.photoType = photoType;
    return springHttp.get(`/work-photos/${interventionId}`, params);
  }
  async getPhotoCounts(interventionId: string): Promise<{ before: number; after: number }> {
    return springHttp.get(`/work-photos/${interventionId}/counts`);
  }
  async hasRequiredPhotos(interventionId: string, photoType: WorkPhotoType): Promise<boolean> {
    const counts = await this.getPhotoCounts(interventionId);
    return counts[photoType] > 0;
  }
  async deletePhoto(photoId: string): Promise<void> {
    await springHttp.delete(`/work-photos/${photoId}`);
  }
}
