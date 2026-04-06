import { supabase } from '@/integrations/supabase/client';

// Storage provider interface - implement this for other providers (S3, Cloudinary, etc.)
export interface StorageProvider {
  upload(bucket: string, path: string, file: File): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
}

// Supabase Storage implementation
class SupabaseStorageProvider implements StorageProvider {
  async upload(bucket: string, path: string, file: File): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return this.getPublicUrl(bucket, data.path);
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

/**
 * Build a standardized intervention storage path.
 * Structure: {interventionId}/{category}/{subFolder?}/{fileName}
 * 
 * Examples:
 *   buildInterventionPath('abc', 'photos', 'img.jpg')
 *     → "abc/photos/img.jpg"
 *   buildInterventionPath('abc', 'work-photos', 'img.jpg', 'before')
 *     → "abc/work-photos/before/img.jpg"
 *   buildInterventionPath('abc', 'quotes', 'devis.pdf')
 *     → "abc/quotes/devis.pdf"
 *   buildInterventionPath('abc', 'invoices', 'facture.pdf')
 *     → "abc/invoices/facture.pdf"
 */
export function buildInterventionPath(
  interventionId: string,
  category: 'photos' | 'work-photos' | 'quotes' | 'invoices',
  fileName: string,
  subFolder?: string,
): string {
  const parts = [interventionId, category];
  if (subFolder) parts.push(subFolder);
  parts.push(fileName);
  return parts.join('/');
}

/**
 * Generate a unique file name with timestamp + random suffix.
 */
export function generateFileName(originalName: string): string {
  const fileExt = originalName.split('.').pop();
  return `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
}

// Main storage service - swap provider here to change implementation
class StorageService {
  private provider: StorageProvider;
  
  constructor(provider: StorageProvider) {
    this.provider = provider;
  }

  setProvider(provider: StorageProvider) {
    this.provider = provider;
  }

  async uploadFile(bucket: string, file: File, folder?: string): Promise<string> {
    const fileName = generateFileName(file.name);
    const path = folder ? `${folder}/${fileName}` : fileName;
    
    return this.provider.upload(bucket, path, file);
  }

  async uploadFiles(bucket: string, files: File[], folder?: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(bucket, file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Upload a file to a specific full path (no auto-generated name).
   */
  async uploadFileToPath(bucket: string, path: string, file: File | Blob): Promise<string> {
    return this.provider.upload(bucket, path, file as File);
  }

  async deleteFile(bucket: string, fileUrl: string): Promise<void> {
    const path = this.extractPathFromUrl(fileUrl, bucket);
    if (path) {
      await this.provider.delete(bucket, path);
    }
  }

  private extractPathFromUrl(url: string, bucket: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(p => p === bucket);
      
      if (bucketIndex === -1) return null;
      return pathParts.slice(bucketIndex + 1).join('/');
    } catch {
      return null;
    }
  }
}

// Export singleton with Supabase provider as default
export const storageService = new StorageService(new SupabaseStorageProvider());

// Export for custom provider implementations
export { SupabaseStorageProvider };
