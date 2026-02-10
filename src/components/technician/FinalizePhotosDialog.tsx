import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Image, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { workPhotosService, WorkPhoto } from '@/services/work-photos/work-photos.service';

interface FinalizePhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interventionId: string;
  userId: string;
  onSuccess: (photos: WorkPhoto[]) => void;
}

export function FinalizePhotosDialog({
  open,
  onOpenChange,
  interventionId,
  userId,
  onSuccess,
}: FinalizePhotosDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadError(null);
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

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Vous devez ajouter au moins une photo du travail effectué');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const uploadedPhotos = await workPhotosService.uploadPhotos(
        interventionId,
        selectedFiles,
        'after',
        userId
      );

      toast.success(`${uploadedPhotos.length} photo(s) enregistrée(s)`);
      onSuccess(uploadedPhotos);
      handleClose();
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      
      // Parse the error to show detailed debug info
      const errorMessage = error?.message || 'Erreur inconnue';
      let debugInfo = '';
      
      if (errorMessage.startsWith('STORAGE_ERROR:')) {
        debugInfo = `🗄️ Échec STOCKAGE: ${errorMessage.replace('STORAGE_ERROR: ', '')}`;
      } else if (errorMessage.startsWith('DATABASE_ERROR:')) {
        debugInfo = `🗃️ Échec BASE DE DONNÉES: ${errorMessage.replace('DATABASE_ERROR: ', '')}`;
      } else {
        debugInfo = `❓ Erreur: ${errorMessage}`;
      }
      
      setUploadError(debugInfo);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset state only on fresh open, not during processing
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (open && !initialized) {
      setSelectedFiles([]);
      setPreviews([]);
      setUploadError(null);
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Finaliser l'intervention
          </DialogTitle>
          <DialogDescription>
            Avant de finaliser, prenez au moins une photo du travail effectué pour documenter la résolution.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div className="space-y-4">
          {/* Photo buttons */}
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

          {/* Preview grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={preview}
                    alt={`Aperçu ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md"
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Status indicator */}
          {selectedFiles.length > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {selectedFiles.length} photo(s) sélectionnée(s)
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isUploading || selectedFiles.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider et finaliser
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
