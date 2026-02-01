import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Loader2, CheckCircle, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { workPhotosService, WorkPhoto, WorkPhotoType } from '@/services/work-photos/work-photos.service';

interface WorkPhotoCaptureProps {
  interventionId: string;
  userId: string;
  photoType: WorkPhotoType;
  title: string;
  description: string;
  onPhotosCaptured: (photos: WorkPhoto[]) => void;
  existingPhotos?: WorkPhoto[];
  disabled?: boolean;
}

export function WorkPhotoCapture({
  interventionId,
  userId,
  photoType,
  title,
  description,
  onPhotosCaptured,
  existingPhotos = [],
  disabled = false,
}: WorkPhotoCaptureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasPhotos = existingPhotos.length > 0 || selectedFiles.length > 0;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Add to selected files
    setSelectedFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedPhotos = await workPhotosService.uploadPhotos(
        interventionId,
        selectedFiles,
        photoType,
        userId
      );

      onPhotosCaptured([...existingPhotos, ...uploadedPhotos]);
      setSelectedFiles([]);
      setPreviews([]);
      toast.success(`${uploadedPhotos.length} photo(s) ajoutée(s)`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erreur lors de l\'upload des photos');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {hasPhotos ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Existing photos */}
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square">
                <img
                  src={photo.photoUrl}
                  alt="Photo de travail"
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                  ✓
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview of selected files */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`Aperçu ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-dashed border-primary"
                />
                <button
                  onClick={() => removeSelectedFile(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {!disabled && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={triggerCamera}
                disabled={isUploading}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Prendre une photo
              </Button>
              <Button
                variant="outline"
                onClick={triggerGallery}
                disabled={isUploading}
                className="flex-1"
              >
                <Image className="h-4 w-4 mr-2" />
                Galerie
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enregistrer {selectedFiles.length} photo(s)
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Status indicator */}
        {hasPhotos && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {existingPhotos.length + selectedFiles.length} photo(s) 
              {selectedFiles.length > 0 ? ' (dont ' + selectedFiles.length + ' en attente d\'upload)' : ''}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
