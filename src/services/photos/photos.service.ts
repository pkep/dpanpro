import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'intervention-photos';

class PhotosService {
  async uploadPhoto(interventionId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${interventionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async uploadPhotos(interventionId: string, files: File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadPhoto(interventionId, file));
    return Promise.all(uploadPromises);
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    // Extract path from URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex((p) => p === BUCKET_NAME);
    
    if (bucketIndex === -1) throw new Error('Invalid photo URL');
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;
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
