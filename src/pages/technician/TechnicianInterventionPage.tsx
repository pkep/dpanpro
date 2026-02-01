import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeIntervention } from '@/hooks/useRealtimeIntervention';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Navigation, 
  Camera, 
  MessageSquare, 
  Phone, 
  FileText, 
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  User,
  XCircle,
  MapPinCheck
} from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS, PRIORITY_LABELS } from '@/types/intervention.types';
import { interventionsService } from '@/services/interventions/interventions.service';
import { historyService } from '@/services/history/history.service';
import { workPhotosService, WorkPhoto } from '@/services/work-photos/work-photos.service';
import { PhotoUpload } from '@/components/photos/PhotoUpload';
import { PhotoGallery } from '@/components/photos/PhotoGallery';
import { InterventionChat } from '@/components/technician/InterventionChat';
import { QuoteModificationForm } from '@/components/technician/QuoteModificationForm';
import { QuoteModificationStatus } from '@/components/technician/QuoteModificationStatus';
import { FinalizeInterventionDialog } from '@/components/technician/FinalizeInterventionDialog';
import { TechnicianRatingDialog } from '@/components/technician/TechnicianRatingDialog';
import { ConfirmActionDialog } from '@/components/interventions/ConfirmActionDialog';
import { WorkPhotoCapture } from '@/components/technician/WorkPhotoCapture';
import { WorkPhotosGallery } from '@/components/technician/WorkPhotosGallery';
import { StartInterventionDialog } from '@/components/technician/StartInterventionDialog';
import { FinalizePhotosDialog } from '@/components/technician/FinalizePhotosDialog';
import { dispatchService } from '@/services/dispatch/dispatch.service';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  on_route: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  arrived: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function TechnicianInterventionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { intervention, loading, error, refresh } = useRealtimeIntervention(id);
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showFinalizePhotosDialog, setShowFinalizePhotosDialog] = useState(false);
  
  // Work photos state
  const [beforePhotos, setBeforePhotos] = useState<WorkPhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<WorkPhoto[]>([]);
  const [workPhotosLoaded, setWorkPhotosLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (intervention?.photos) {
      setPhotos(intervention.photos);
    }
  }, [intervention?.photos]);

  // Load work photos
  useEffect(() => {
    if (intervention?.id && user) {
      loadWorkPhotos();
    }
  }, [intervention?.id, user]);

  const loadWorkPhotos = async () => {
    if (!intervention?.id) return;
    try {
      const allPhotos = await workPhotosService.getPhotos(intervention.id);
      setBeforePhotos(allPhotos.filter(p => p.photoType === 'before'));
      setAfterPhotos(allPhotos.filter(p => p.photoType === 'after'));
      setWorkPhotosLoaded(true);
    } catch (err) {
      console.error('Error loading work photos:', err);
      setWorkPhotosLoaded(true);
    }
  };

  const handleNavigate = () => {
    if (!intervention?.latitude || !intervention?.longitude) {
      const address = encodeURIComponent(
        `${intervention?.address}, ${intervention?.postalCode} ${intervention?.city}`
      );
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${intervention.latitude},${intervention.longitude}`,
        '_blank'
      );
    }
  };

  const handleCall = () => {
    if (intervention?.clientPhone) {
      window.location.href = `tel:${intervention.clientPhone}`;
    } else {
      toast.error('Numéro de téléphone non disponible');
    }
  };

  const handleStatusChange = async (newStatus: 'on_route' | 'arrived' | 'in_progress') => {
    if (!intervention || !user) return;
    
    setIsUpdatingStatus(true);
    try {
      await interventionsService.updateStatus(intervention.id, newStatus);
      await historyService.addHistoryEntry({
        interventionId: intervention.id,
        userId: user.id,
        action: 'status_changed',
        oldValue: intervention.status,
        newValue: newStatus,
      });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[newStatus]}`);
      refresh();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartInterventionClick = () => {
    setShowStartDialog(true);
  };

  const handleStartInterventionSuccess = async (photos: WorkPhoto[]) => {
    setBeforePhotos(photos);
    // Now change status to in_progress
    await handleStatusChange('in_progress');
  };

  const handlePhotosUpdated = (newPhotos: string[]) => {
    setPhotos(newPhotos);
  };

  const handleBeforePhotosCaptured = (photos: WorkPhoto[]) => {
    setBeforePhotos(photos);
  };

  const handleAfterPhotosCaptured = (photos: WorkPhoto[]) => {
    setAfterPhotos(photos);
  };

  const handleFinalizeClick = () => {
    // If no after photos, show photo capture dialog first
    if (afterPhotos.length === 0) {
      setShowFinalizePhotosDialog(true);
      return;
    }
    setShowFinalizeDialog(true);
  };

  const handleFinalizePhotosSuccess = (photos: WorkPhoto[]) => {
    setAfterPhotos(prev => [...prev, ...photos]);
    // Now open the finalize dialog for payment
    setShowFinalizeDialog(true);
  };

  const handleCancelIntervention = async (reason?: string) => {
    if (!intervention || !user || !reason) return;
    
    setIsCancelling(true);
    try {
      const result = await dispatchService.cancelAssignment(intervention.id, user.id, reason);
      if (result.success) {
        toast.success('Intervention annulée', {
          description: 'Elle sera reproposée à d\'autres techniciens.',
        });
        navigate('/technician');
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error cancelling intervention:', err);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (authLoading || loading) {
    return (
      <TechnicianLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </TechnicianLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (error || !intervention) {
    return (
      <TechnicianLayout title="Intervention">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Intervention non trouvée'}</AlertDescription>
        </Alert>
      </TechnicianLayout>
    );
  }

  const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
  const categoryIcon = CATEGORY_ICONS[intervention.category] || '🔧';
  const statusLabel = STATUS_LABELS[intervention.status] || intervention.status;
  const priorityLabel = PRIORITY_LABELS[intervention.priority] || intervention.priority;

  const isCompleted = intervention.status === 'completed';
  const isCancelled = intervention.status === 'cancelled';
  const canFinalize = intervention.status === 'in_progress';
  const canCancel = ['new', 'assigned', 'on_route', 'arrived'].includes(intervention.status);
  const showBeforePhotos = intervention.status === 'in_progress' && beforePhotos.length > 0;
  const showAfterPhotos = intervention.status === 'in_progress';

  return (
    <TechnicianLayout 
      title={`${categoryIcon} ${categoryLabel}`}
      subtitle={`${intervention.address}, ${intervention.city}`}
    >
      {/* Status Badge */}
      <div className="mb-4">
        <Badge className={STATUS_COLORS[intervention.status]}>{statusLabel}</Badge>
      </div>

      {/* Quick Info Card */}
      <Card className="mb-4">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">{intervention.address}</p>
              <p className="text-sm text-muted-foreground">
                {intervention.postalCode} {intervention.city}
              </p>
            </div>
          </div>
          
          {intervention.description && (
            <p className="text-sm text-muted-foreground">{intervention.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{priorityLabel}</Badge>
            {intervention.estimatedPrice && (
              <Badge variant="secondary">
                Estimé: {intervention.estimatedPrice.toFixed(2)} €
              </Badge>
            )}
          </div>

          {/* Client Info */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{intervention.clientEmail || 'Client'}</span>
            </div>
            {intervention.clientPhone && (
              <Button variant="outline" size="sm" onClick={handleCall}>
                <Phone className="h-4 w-4 mr-2" />
                Appeler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Actions */}
      {!isCompleted && !isCancelled && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={handleNavigate} variant="default">
              <Navigation className="h-4 w-4 mr-2" />
              Naviguer
            </Button>
            
            {intervention.status === 'assigned' && (
              <Button 
                onClick={() => handleStatusChange('on_route')} 
                variant="secondary"
                disabled={isUpdatingStatus}
              >
                <Clock className="h-4 w-4 mr-2" />
                En route
              </Button>
            )}
            
            {intervention.status === 'on_route' && (
              <Button 
                onClick={() => handleStatusChange('arrived')} 
                variant="secondary"
                disabled={isUpdatingStatus}
              >
                <MapPinCheck className="h-4 w-4 mr-2" />
                Je suis arrivé
              </Button>
            )}
            
            {intervention.status === 'arrived' && (
              <Button 
                onClick={handleStartInterventionClick} 
                variant="secondary"
                disabled={isUpdatingStatus}
              >
                <Camera className="h-4 w-4 mr-2" />
                Commencer
              </Button>
            )}
            
            {canFinalize && (
              <Button 
                onClick={handleFinalizeClick} 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Finaliser
              </Button>
            )}
            
            {canCancel && (
              <Button 
                onClick={() => setShowCancelDialog(true)} 
                variant="destructive"
                disabled={isCancelling}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Photos - Before (read-only display once in_progress) */}
      {showBeforePhotos && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              📷 Photos avant intervention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {beforePhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.photoUrl}
                    alt="Photo avant"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showAfterPhotos && user && (
        <div className="mb-4">
          <WorkPhotoCapture
            interventionId={intervention.id}
            userId={user.id}
            photoType="after"
            title="📷 Photos après intervention"
            description="Prenez des photos de la panne résolue pour documenter le travail effectué (obligatoire avant de finaliser)"
            onPhotosCaptured={handleAfterPhotosCaptured}
            existingPhotos={afterPhotos}
          />
        </div>
      )}

      {/* Quote Modification Status (shows pending approval) */}
      <QuoteModificationStatus 
        interventionId={intervention.id} 
        onRefresh={refresh}
      />

      {/* Tabs */}
      <Tabs defaultValue="photos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="quote">
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Devis</span>
          </TabsTrigger>
          <TabsTrigger value="info">
            <AlertCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Infos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-4">
          {/* Work photos gallery (before/after - internal) */}
          {workPhotosLoaded && (beforePhotos.length > 0 || afterPhotos.length > 0) && (
            <WorkPhotosGallery 
              interventionId={intervention.id}
              canDelete={!isCompleted && !isCancelled}
              onPhotosChange={loadWorkPhotos}
            />
          )}
          
          {/* Client-facing photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos partagées avec le client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PhotoUpload
                interventionId={intervention.id}
                existingPhotos={photos}
                onPhotosUpdated={handlePhotosUpdated}
                disabled={isCompleted || isCancelled}
              />
              <PhotoGallery
                interventionId={intervention.id}
                photos={photos}
                onPhotosUpdated={handlePhotosUpdated}
                canDelete={!isCompleted && !isCancelled}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <InterventionChat
            interventionId={intervention.id}
            userId={user.id}
            userRole="technician"
          />
        </TabsContent>

        <TabsContent value="quote">
          <QuoteModificationForm
            interventionId={intervention.id}
            technicianId={user.id}
            clientEmail={intervention.clientEmail}
            clientPhone={intervention.clientPhone}
            disabled={isCompleted || isCancelled}
          />
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Code de suivi</p>
                <p className="font-mono font-medium">{intervention.trackingCode || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créée le</p>
                <p>{new Date(intervention.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              {intervention.startedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Démarrée le</p>
                  <p>{new Date(intervention.startedAt).toLocaleString('fr-FR')}</p>
                </div>
              )}
              {intervention.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Terminée le</p>
                  <p>{new Date(intervention.completedAt).toLocaleString('fr-FR')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Finalize Dialog */}
      <FinalizeInterventionDialog
        open={showFinalizeDialog}
        onOpenChange={setShowFinalizeDialog}
        intervention={intervention}
        onFinalized={() => {
          setShowFinalizeDialog(false);
          setShowRatingDialog(true);
        }}
      />

      {/* Rating Dialog - shown after finalization */}
      {user && (
        <TechnicianRatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          interventionId={intervention.id}
          technicianId={user.id}
          onSubmitted={() => {
            setShowRatingDialog(false);
            refresh();
            navigate('/technician');
          }}
        />
      )}

      {/* Cancel Dialog */}
      <ConfirmActionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        action="cancel_intervention"
        onConfirm={handleCancelIntervention}
      />

      {/* Start Intervention Dialog with photo capture */}
      {user && (
        <StartInterventionDialog
          open={showStartDialog}
          onOpenChange={setShowStartDialog}
          interventionId={intervention.id}
          userId={user.id}
          onSuccess={handleStartInterventionSuccess}
        />
      )}

      {/* Finalize Photos Dialog */}
      {user && (
        <FinalizePhotosDialog
          open={showFinalizePhotosDialog}
          onOpenChange={setShowFinalizePhotosDialog}
          interventionId={intervention.id}
          userId={user.id}
          onSuccess={handleFinalizePhotosSuccess}
        />
      )}
    </TechnicianLayout>
  );
}
