import { supabase } from '@/integrations/supabase/client';
import { storageService } from '@/services/storage/storage.service';

const BUCKET_NAME = 'intervention-photos';

class PhotosService {
  async uploadPhoto(interventionId: string, file: File): Promise<string> {
    return storageService.uploadFile(BUCKET_NAME, file, interventionId);
  }

  async uploadPhotos(interventionId: string, files: File[]): Promise<string[]> {
    return storageService.uploadFiles(BUCKET_NAME, files, interventionId);
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    return storageService.deleteFile(BUCKET_NAME, photoUrl);
  }

  async updateInterventionPhotos(interventionId: string, photos: string[]): Promise<void> {
    const { error } = await supabase
      .from('interventions')
      .update({ photos })
      .eq('id', interventionId);

    if (error) throw error;
  }

  async getInterventionPhotos(interventionId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('interventions')
      .select('photos')
      .eq('id', interventionId)
      .single();

    if (error) throw error;
    return data?.photos || [];
  }
}

export const photosService = new PhotosService();
