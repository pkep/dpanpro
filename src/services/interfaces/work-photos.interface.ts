import type { WorkPhoto, WorkPhotoType } from '@/services/supabase/work-photos.service';

export interface IWorkPhotosService {
  uploadPhotos(interventionId: string, files: File[], photoType: WorkPhotoType, uploadedBy: string, description?: string): Promise<WorkPhoto[]>;
  getPhotos(interventionId: string, photoType?: WorkPhotoType): Promise<WorkPhoto[]>;
  getPhotoCounts(interventionId: string): Promise<{ before: number; after: number }>;
  hasRequiredPhotos(interventionId: string, photoType: WorkPhotoType): Promise<boolean>;
  deletePhoto(photoId: string): Promise<void>;
}
