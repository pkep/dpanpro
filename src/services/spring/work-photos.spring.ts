import type { IWorkPhotosService } from '@/services/interfaces/work-photos.interface';
import type { WorkPhoto, WorkPhotoType } from '@/services/supabase/work-photos.service';
import { springHttp } from './http-client';

export class SpringWorkPhotosService implements IWorkPhotosService {
  // POST /interventions/{id}/work-photos (multipart)
  async uploadPhotos(interventionId: string, files: File[], photoType: WorkPhotoType, _uploadedBy: string, description?: string): Promise<WorkPhoto[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('photoType', photoType);
    if (description) formData.append('description', description);
    return springHttp.upload(`/interventions/${interventionId}/work-photos`, formData);
  }

  // GET /interventions/{id}/work-photos?photoType=
  async getPhotos(interventionId: string, photoType?: WorkPhotoType): Promise<WorkPhoto[]> {
    const params: Record<string, string> = {};
    if (photoType) params.photoType = photoType;
    return springHttp.get(`/interventions/${interventionId}/work-photos`, params);
  }

  // GET /interventions/{id}/work-photos/counts
  async getPhotoCounts(interventionId: string): Promise<{ before: number; after: number }> {
    return springHttp.get(`/interventions/${interventionId}/work-photos/counts`);
  }

  async hasRequiredPhotos(interventionId: string, photoType: WorkPhotoType): Promise<boolean> {
    const counts = await this.getPhotoCounts(interventionId);
    return counts[photoType] > 0;
  }

  // DELETE /work-photos/{photoId}
  async deletePhoto(photoId: string): Promise<void> {
    await springHttp.delete(`/work-photos/${photoId}`);
  }
}
