import { useState, useRef } from 'react';
import { photosService } from '@/services/photos/photos.service';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  interventionId: string;
  existingPhotos: string[];
  onPhotosUpdated: (photos: string[]) => void;
  disabled?: boolean;
}

export function PhotoUpload({
  interventionId,
  existingPhotos,
  onPhotosUpdated,
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    try {
      setUploading(true);
      setProgress(0);

      const newUrls: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const url = await photosService.uploadPhoto(interventionId, validFiles[i]);
        newUrls.push(url);
        setProgress(((i + 1) / validFiles.length) * 100);
      }

      const updatedPhotos = [...existingPhotos, ...newUrls];
      await photosService.updateInterventionPhotos(interventionId, updatedPhotos);
      onPhotosUpdated(updatedPhotos);
      
      toast.success(`${newUrls.length} photo(s) ajoutée(s)`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
              <Progress value={progress} className="w-48" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Glissez des photos ici ou
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                <Upload className="h-4 w-4 mr-2" />
                Sélectionner des fichiers
              </Button>
              <p className="text-xs text-muted-foreground">
                Images jusqu'à 10MB (JPG, PNG, WebP)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
