export interface IPhotosService {
  uploadPhoto(interventionId: string, file: File): Promise<string>;
  uploadPhotos(interventionId: string, files: File[]): Promise<string[]>;
  deletePhoto(photoUrl: string): Promise<void>;
  updateInterventionPhotos(interventionId: string, photos: string[]): Promise<void>;
  getInterventionPhotos(interventionId: string): Promise<string[]>;
}
