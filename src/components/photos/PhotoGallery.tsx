import { useState } from 'react';
import { photosService } from '@/services/photos/photos.service';
import { historyService } from '@/services/history/history.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, ChevronLeft, ChevronRight, Trash2, ZoomIn, Download, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
  interventionId: string;
  photos: string[];
  onPhotosUpdated: (photos: string[]) => void;
  canDelete?: boolean;
}

export function PhotoGallery({
  interventionId,
  photos,
  onPhotosUpdated,
  canDelete = false,
}: PhotoGalleryProps) {
  const { user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0);
  };

  const handleDelete = async () => {
    if (!deleteUrl) return;

    try {
      setDeleting(true);
      await photosService.deletePhoto(deleteUrl);
      const updatedPhotos = photos.filter((p) => p !== deleteUrl);
      await photosService.updateInterventionPhotos(interventionId, updatedPhotos);
      onPhotosUpdated(updatedPhotos);
      
      // Add history entry for photo deletion
      if (user) {
        await historyService.addHistoryEntry({
          interventionId,
          userId: user.id,
          action: 'photo_deleted',
          comment: 'Photo supprimée',
        });
      }
      
      toast.success('Photo supprimée');
      
      // Close lightbox if showing deleted photo
      if (selectedIndex !== null && photos[selectedIndex] === deleteUrl) {
        setSelectedIndex(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setDeleteUrl(null);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">Aucune photo</p>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo}
            className="relative aspect-square group cursor-pointer rounded-lg overflow-hidden border bg-muted"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="h-6 w-6 text-white" />
            </div>
            {canDelete && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteUrl(photo);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 text-white hover:bg-white/20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 text-white hover:bg-white/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && (
              <img
                src={photos[selectedIndex]}
                alt={`Photo ${selectedIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />
            )}

            {/* Actions */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {selectedIndex !== null ? selectedIndex + 1 : 0} / {photos.length}
              </span>
              {selectedIndex !== null && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(photos[selectedIndex])}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </Button>
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteUrl(photos[selectedIndex])}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUrl} onOpenChange={() => setDeleteUrl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette photo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La photo sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
