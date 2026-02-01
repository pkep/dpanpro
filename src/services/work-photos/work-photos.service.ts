import { supabase } from '@/integrations/supabase/client';
import { storageService } from '@/services/storage/storage.service';

const BUCKET_NAME = 'intervention-photos';

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

interface DbWorkPhoto {
  id: string;
  intervention_id: string;
  photo_url: string;
  photo_type: string;
  uploaded_by: string;
  description: string | null;
  created_at: string;
}

class WorkPhotosService {
  /**
   * Upload work photos for an intervention (before/after)
   * Uses the abstracted storage service to allow provider swapping
   */
  async uploadPhotos(
    interventionId: string,
    files: File[],
    photoType: WorkPhotoType,
    uploadedBy: string,
    description?: string
  ): Promise<WorkPhoto[]> {
    // Upload files to storage
    const folder = `work-photos/${interventionId}/${photoType}`;
    const uploadedUrls = await storageService.uploadFiles(BUCKET_NAME, files, folder);

    // Insert records into database
    const insertData = uploadedUrls.map(url => ({
      intervention_id: interventionId,
      photo_url: url,
      photo_type: photoType,
      uploaded_by: uploadedBy,
      description: description || null,
    }));

    const { data, error } = await supabase
      .from('intervention_work_photos')
      .insert(insertData)
      .select();

    if (error) throw error;

    return (data as DbWorkPhoto[]).map(this.mapToWorkPhoto);
  }

  /**
   * Get work photos for an intervention
   */
  async getPhotos(interventionId: string, photoType?: WorkPhotoType): Promise<WorkPhoto[]> {
    let query = supabase
      .from('intervention_work_photos')
      .select('*')
      .eq('intervention_id', interventionId)
      .order('created_at', { ascending: true });

    if (photoType) {
      query = query.eq('photo_type', photoType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return ((data || []) as DbWorkPhoto[]).map(this.mapToWorkPhoto);
  }

  /**
   * Get count of photos by type
   */
  async getPhotoCounts(interventionId: string): Promise<{ before: number; after: number }> {
    const { data, error } = await supabase
      .from('intervention_work_photos')
      .select('photo_type')
      .eq('intervention_id', interventionId);

    if (error) throw error;

    const counts = { before: 0, after: 0 };
    (data || []).forEach((photo: { photo_type: string }) => {
      if (photo.photo_type === 'before') counts.before++;
      else if (photo.photo_type === 'after') counts.after++;
    });

    return counts;
  }

  /**
   * Check if intervention has required photos
   */
  async hasRequiredPhotos(interventionId: string, photoType: WorkPhotoType): Promise<boolean> {
    const counts = await this.getPhotoCounts(interventionId);
    return counts[photoType] > 0;
  }

  /**
   * Delete a work photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    // Get the photo first to get the URL
    const { data: photo, error: fetchError } = await supabase
      .from('intervention_work_photos')
      .select('photo_url')
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (photo?.photo_url) {
      await storageService.deleteFile(BUCKET_NAME, photo.photo_url);
    }

    // Delete from database
    const { error } = await supabase
      .from('intervention_work_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
  }

  private mapToWorkPhoto(data: DbWorkPhoto): WorkPhoto {
    return {
      id: data.id,
      interventionId: data.intervention_id,
      photoUrl: data.photo_url,
      photoType: data.photo_type as WorkPhotoType,
      uploadedBy: data.uploaded_by,
      description: data.description,
      createdAt: data.created_at,
    };
  }
}

export const workPhotosService = new WorkPhotosService();
