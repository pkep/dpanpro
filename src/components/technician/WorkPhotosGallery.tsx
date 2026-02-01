import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Trash2, Download, ZoomIn } from 'lucide-react';
import { workPhotosService, WorkPhoto } from '@/services/work-photos/work-photos.service';
import { toast } from 'sonner';

interface WorkPhotosGalleryProps {
  interventionId: string;
  canDelete?: boolean;
  onPhotosChange?: () => void;
}

export function WorkPhotosGallery({
  interventionId,
  canDelete = false,
  onPhotosChange,
}: WorkPhotosGalleryProps) {
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<WorkPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [interventionId]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await workPhotosService.getPhotos(interventionId);
      setPhotos(data);
    } catch (error) {
      console.error('Error loading work photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photo: WorkPhoto) => {
    if (!canDelete) return;
    
    setIsDeleting(photo.id);
    try {
      await workPhotosService.deletePhoto(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success('Photo supprimée');
      onPhotosChange?.();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = (photo: WorkPhoto) => {
    const link = document.createElement('a');
    link.href = photo.photoUrl;
    link.download = `work-photo-${photo.photoType}-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const beforePhotos = photos.filter(p => p.photoType === 'before');
  const afterPhotos = photos.filter(p => p.photoType === 'after');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos de travail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos de travail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune photo de travail enregistrée
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderPhotoSection = (title: string, sectionPhotos: WorkPhoto[], badgeColor: string) => {
    if (sectionPhotos.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={badgeColor}>{title}</Badge>
          <span className="text-xs text-muted-foreground">
            ({sectionPhotos.length} photo{sectionPhotos.length > 1 ? 's' : ''})
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {sectionPhotos.map(photo => (
            <div key={photo.id} className="relative group aspect-square">
              <img
                src={photo.photoUrl}
                alt={`Photo ${photo.photoType}`}
                className="w-full h-full object-cover rounded-lg cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => handleDownload(photo)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-destructive/80"
                    onClick={() => handleDelete(photo)}
                    disabled={isDeleting === photo.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos de travail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderPhotoSection(
            'Avant intervention',
            beforePhotos,
            'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
          )}
          {renderPhotoSection(
            'Après intervention',
            afterPhotos,
            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          )}
        </CardContent>
      </Card>

      {/* Lightbox dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Photo {selectedPhoto?.photoType === 'before' ? 'avant' : 'après'} intervention
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photoUrl}
                alt="Photo de travail"
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  Prise le {new Date(selectedPhoto.createdAt).toLocaleString('fr-FR')}
                </span>
                <Button size="sm" variant="outline" onClick={() => handleDownload(selectedPhoto)}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
