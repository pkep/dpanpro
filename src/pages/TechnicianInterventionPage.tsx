import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeIntervention } from '@/hooks/useRealtimeIntervention';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Navigation, 
  Camera, 
  MessageSquare, 
  Phone, 
  FileText, 
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  User
} from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS, PRIORITY_LABELS } from '@/types/intervention.types';
import { interventionsService } from '@/services/interventions/interventions.service';
import { historyService } from '@/services/history/history.service';
import { PhotoUpload } from '@/components/photos/PhotoUpload';
import { PhotoGallery } from '@/components/photos/PhotoGallery';
import { InterventionChat } from '@/components/technician/InterventionChat';
import { QuoteModificationForm } from '@/components/technician/QuoteModificationForm';
import { QuoteModificationStatus } from '@/components/technician/QuoteModificationStatus';
import { FinalizeInterventionDialog } from '@/components/technician/FinalizeInterventionDialog';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  en_route: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
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

  const handleNavigate = () => {
    if (!intervention?.latitude || !intervention?.longitude) {
      // Use address-based navigation
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

  const handleStatusChange = async (newStatus: 'en_route' | 'in_progress') => {
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

  const handlePhotosUpdated = (newPhotos: string[]) => {
    setPhotos(newPhotos);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== 'technician' && user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Accès réservé aux techniciens</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/technician">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Intervention non trouvée'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
  const categoryIcon = CATEGORY_ICONS[intervention.category] || '🔧';
  const statusLabel = STATUS_LABELS[intervention.status] || intervention.status;
  const priorityLabel = PRIORITY_LABELS[intervention.priority] || intervention.priority;

  const isCompleted = intervention.status === 'completed';
  const isCancelled = intervention.status === 'cancelled';
  const canFinalize = intervention.status === 'in_progress';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/technician">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{categoryIcon}</span>
              <h1 className="font-semibold">{categoryLabel}</h1>
            </div>
          </div>
          <Badge className={STATUS_COLORS[intervention.status]}>{statusLabel}</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-4 pb-24">
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
                  onClick={() => handleStatusChange('en_route')} 
                  variant="secondary"
                  disabled={isUpdatingStatus}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  En route
                </Button>
              )}
              
              {intervention.status === 'en_route' && (
                <Button 
                  onClick={() => handleStatusChange('in_progress')} 
                  variant="secondary"
                  disabled={isUpdatingStatus}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Commencer
                </Button>
              )}
              
              {canFinalize && (
                <Button 
                  onClick={() => setShowFinalizeDialog(true)} 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finaliser
                </Button>
              )}
            </CardContent>
          </Card>
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
      </main>

      {/* Finalize Dialog */}
      <FinalizeInterventionDialog
        open={showFinalizeDialog}
        onOpenChange={setShowFinalizeDialog}
        intervention={intervention}
        onFinalized={() => {
          refresh();
          navigate('/technician');
        }}
      />
    </div>
  );
}
