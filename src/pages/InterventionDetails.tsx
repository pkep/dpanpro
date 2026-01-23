import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeIntervention } from '@/hooks/useRealtimeIntervention';
import { interventionsService } from '@/services/interventions/interventions.service';
import { historyService } from '@/services/history/history.service';
import { usersService } from '@/services/users/users.service';
import { invoiceService } from '@/services/invoice/invoice.service';
import type { InterventionStatus } from '@/types/intervention.types';
import type { User } from '@/types/auth.types';
import { STATUS_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, PRIORITY_LABELS } from '@/types/intervention.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InterventionTimeline } from '@/components/interventions/InterventionTimeline';
import { StatusTimeline } from '@/components/interventions/StatusTimeline';
import { AddCommentForm } from '@/components/interventions/AddCommentForm';
import { PhotoUpload } from '@/components/photos/PhotoUpload';
import { PhotoGallery } from '@/components/photos/PhotoGallery';
import { SingleLocationMap } from '@/components/map/SingleLocationMap';
import { ClientTrackingMap } from '@/components/map/ClientTrackingMap';
import { RatingForm } from '@/components/ratings/RatingForm';
import { TechnicianRating } from '@/components/ratings/TechnicianRating';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { PendingQuoteBlocker } from '@/components/interventions/PendingQuoteBlocker';
import {
  Home,
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  User as UserIcon,
  Wrench,
  AlertCircle,
  CheckCircle,
  Radio,
  Camera,
  Map,
  Star,
  Download,
  Loader2,
  FileText,
  XCircle,
} from 'lucide-react';
import { ConfirmActionDialog } from '@/components/interventions/ConfirmActionDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_COLORS: Record<InterventionStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-200',
  assigned: 'bg-purple-500/10 text-purple-600 border-purple-200',
  on_route: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  in_progress: 'bg-orange-500/10 text-orange-600 border-orange-200',
  completed: 'bg-green-500/10 text-green-600 border-green-200',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function InterventionDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { intervention, loading, error, refresh } = useRealtimeIntervention(id);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [updating, setUpdating] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const navigate = useNavigate();

  const handleDownloadInvoice = async () => {
    if (!intervention) return;
    try {
      setDownloadingInvoice(true);
      await invoiceService.generateAndDownloadInvoice(intervention);
      toast.success('Facture téléchargée avec succès');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Erreur lors du téléchargement de la facture');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleCancelIntervention = async (reason?: string) => {
    if (!intervention || !reason) return;
    
    setIsCancelling(true);
    try {
      await interventionsService.cancelIntervention(intervention.id, reason);
      toast.success('Demande annulée avec succès');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error cancelling intervention:', err);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const canCancelAsClient = user?.role === 'client' && ['new', 'assigned', 'on_route'].includes(intervention?.status || '');

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const data = await usersService.getTechnicians();
        setTechnicians(data);
      } catch (err) {
        console.error('Error fetching technicians:', err);
      }
    };
    fetchTechnicians();
  }, []);

  // Sync photos from intervention
  useEffect(() => {
    if (intervention?.photos) {
      setPhotos(intervention.photos);
    } else {
      setPhotos([]);
    }
  }, [intervention?.photos]);

  const handleStatusChange = async (newStatus: InterventionStatus) => {
    if (!intervention || !user) return;

    try {
      setUpdating(true);
      const oldStatus = intervention.status;
      await interventionsService.updateStatus(intervention.id, newStatus);
      await historyService.addHistoryEntry({
        interventionId: intervention.id,
        userId: user.id,
        action: 'status_changed',
        oldValue: oldStatus,
        newValue: newStatus,
      });
      toast.success('Statut mis à jour');
      setHistoryRefreshKey((k) => k + 1);
      refresh();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignTechnician = async (technicianId: string) => {
    if (!intervention || !user) return;

    try {
      setUpdating(true);
      await interventionsService.assignTechnician(intervention.id, technicianId);
      await historyService.addHistoryEntry({
        interventionId: intervention.id,
        userId: user.id,
        action: 'assigned',
        newValue: technicianId,
      });
      toast.success('Technicien assigné');
      setHistoryRefreshKey((k) => k + 1);
      refresh();
    } catch (err) {
      toast.error('Erreur lors de l\'assignation');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const getTechnicianName = (technicianId: string | null | undefined) => {
    if (!technicianId) return 'Non assigné';
    const tech = technicians.find((t) => t.id === technicianId);
    return tech ? `${tech.firstName} ${tech.lastName}` : 'Inconnu';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Intervention non trouvée'}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const canEdit = user.role === 'admin' || user.role === 'technician';

  return (
    <div className="min-h-screen bg-background">
      {/* Blocking modal for pending quote modifications - only for clients */}
      {user.role === 'client' && intervention.status !== 'completed' && intervention.status !== 'cancelled' && (
        <PendingQuoteBlocker 
          interventionId={intervention.id} 
          onQuoteResolved={refresh}
        />
      )}
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[intervention.category]}</span>
                <h1 className="text-xl font-bold">{intervention.title}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {CATEGORY_LABELS[intervention.category]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              Temps réel
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Détails de l'intervention</span>
                  <Badge className={`${STATUS_COLORS[intervention.status]} border text-sm`}>
                    {intervention.status === 'new' ? 'Demande reçue' : STATUS_LABELS[intervention.status]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm">{intervention.description || 'Aucune description fournie'}</p>
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Progression</h4>
                  <StatusTimeline currentStatus={intervention.status} />
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresse
                  </h4>
                  <p className="text-sm">
                    {intervention.address}<br />
                    {intervention.postalCode} {intervention.city}
                  </p>
                </div>

                {/* Live Tracking Map for Clients */}
                {user.role === 'client' && intervention.technicianId && intervention.latitude && intervention.longitude && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                      Suivi en temps réel
                    </h4>
                    <ClientTrackingMap
                      interventionId={intervention.id}
                      technicianId={intervention.technicianId}
                      destinationLatitude={intervention.latitude}
                      destinationLongitude={intervention.longitude}
                      destinationAddress={`${intervention.address}, ${intervention.postalCode} ${intervention.city}`}
                      interventionStatus={intervention.status}
                      height="350px"
                    />
                  </div>
                )}

                {/* Static Map for Admin/Technician or when no tracking */}
                {(user.role !== 'client' || !intervention.technicianId) && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Localisation
                    </h4>
                    <SingleLocationMap
                      address={intervention.address}
                      city={intervention.city}
                      postalCode={intervention.postalCode}
                      latitude={intervention.latitude}
                      longitude={intervention.longitude}
                      title={intervention.title}
                      height="250px"
                    />
                  </div>
                )}

                <Separator />

                {/* Meta Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Priorité</h4>
                    <Badge variant="outline">{PRIORITY_LABELS[intervention.priority]}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Technicien</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        {getTechnicianName(intervention.technicianId)}
                      </p>
                      {intervention.technicianId && (
                        <TechnicianRating 
                          technicianId={intervention.technicianId} 
                          size="sm" 
                          showCount={false} 
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Créée le
                    </h4>
                    <p className="text-sm">
                      {format(new Date(intervention.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {intervention.completedAt && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Terminée le
                      </h4>
                      <p className="text-sm">
                        {format(new Date(intervention.completedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin/Tech Actions */}
                {canEdit && (
                  <>
                    <Separator />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Changer le statut</h4>
                        <Select
                          value={intervention.status}
                          onValueChange={(value) => handleStatusChange(value as InterventionStatus)}
                          disabled={updating}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {user.role === 'admin' && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Assigner un technicien</h4>
                          <Select
                            value={intervention.technicianId || 'unassigned'}
                            onValueChange={(value) => {
                              if (value !== 'unassigned') {
                                handleAssignTechnician(value);
                              }
                            }}
                            disabled={updating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {technicians.map((tech) => (
                                <SelectItem key={tech.id} value={tech.id}>
                                  {tech.firstName} {tech.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Client Cancel Button */}
                {canCancelAsClient && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Actions</h4>
                      <Button
                        variant="destructive"
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={isCancelling}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuler cette demande
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Photos Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photos ({photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit && (
                  <PhotoUpload
                    interventionId={intervention.id}
                    existingPhotos={photos}
                    onPhotosUpdated={setPhotos}
                  />
                )}
                <PhotoGallery
                  interventionId={intervention.id}
                  photos={photos}
                  onPhotosUpdated={setPhotos}
                  canDelete={canEdit}
                />
              </CardContent>
            </Card>

            {/* Invoice Download & Rating Section (for completed interventions) */}
            {intervention.status === 'completed' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Facture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        L'intervention est terminée. Vous pouvez télécharger votre facture.
                      </p>
                      {intervention.finalPrice && (
                        <p className="text-lg font-semibold mt-1">
                          Montant : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(intervention.finalPrice)}
                        </p>
                      )}
                    </div>
                    <Button onClick={handleDownloadInvoice} disabled={downloadingInvoice}>
                      {downloadingInvoice ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Télécharger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rating Section (for completed interventions) */}
            {intervention.status === 'completed' && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Évaluation
                </h3>
                <RatingForm
                  interventionId={intervention.id}
                  clientId={intervention.clientId}
                  interventionStatus={intervention.status}
                  isClient={user.role === 'client'}
                />
              </div>
            )}

            {/* Add Comment */}
            <Card>
              <CardHeader>
                <CardTitle>Ajouter un commentaire</CardTitle>
              </CardHeader>
              <CardContent>
                <AddCommentForm
                  interventionId={intervention.id}
                  onCommentAdded={() => setHistoryRefreshKey((k) => k + 1)}
                />
              </CardContent>
            </Card>

            {/* Push Notifications Setup for Clients */}
            {user.role === 'client' && intervention.status !== 'completed' && intervention.status !== 'cancelled' && (
              <PushNotificationSetup />
            )}
          </div>

          {/* Timeline Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InterventionTimeline
                  interventionId={intervention.id}
                  refreshKey={historyRefreshKey}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Cancel Dialog for Clients */}
      <ConfirmActionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        action="cancel_client"
        onConfirm={handleCancelIntervention}
      />
    </div>
  );
}
