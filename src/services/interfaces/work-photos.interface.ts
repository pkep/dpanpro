export type WorkPhotoType = 'before' | 'after';

export interface WorkPhoto {
  id: string;
  interventionId: string;
  photoUrl: string;
  photoType: WorkPhotoType;
  uploadedBy: string;
  description?: string | null;
  createdAt: string;
}

export interface IWorkPhotosService {
  uploadPhotos(interventionId: string, files: File[], photoType: WorkPhotoType, uploadedBy: string, description?: string): Promise<WorkPhoto[]>;
  getPhotos(interventionId: string, photoType?: WorkPhotoType): Promise<WorkPhoto[]>;
  getPhotoCounts(interventionId: string): Promise<{ before: number; after: number }>;
  hasRequiredPhotos(interventionId: string, photoType: WorkPhotoType): Promise<boolean>;
  deletePhoto(photoId: string): Promise<void>;
}
