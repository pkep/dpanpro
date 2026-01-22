import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { InterventionCategory, InterventionStatus, CATEGORY_LABELS, CATEGORY_ICONS, PRIORITY_LABELS } from '@/types/intervention.types';
import { dispatchService } from '@/services/dispatch/dispatch.service';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Inbox, MapPin, Navigation, Check, X, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ConfirmActionDialog } from './ConfirmActionDialog';

interface AvailableInterventionsListProps {
  technicianId: string;
  onInterventionAccepted?: (intervention: AvailableIntervention) => void;
}

interface AvailableIntervention {
  id: string;
  clientId: string;
  technicianId: string | null;
  category: InterventionCategory;
  priority: string;
  status: InterventionStatus;
  title: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  estimatedPrice: number | null;
  finalPrice: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  photos?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trackingCode: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  score?: number;
  attemptOrder?: number;
  distanceKm?: number;
  estimatedMinutes?: number;
}

export function AvailableInterventionsList({ 
  technicianId,
  onInterventionAccepted 
}: AvailableInterventionsListProps) {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<AvailableIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedInterventionId, setAcceptedInterventionId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'decline' | 'accept' | 'go' | 'cancel' | 'en_route' | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<AvailableIntervention | null>(null);

  const fetchAvailableInterventions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all pending dispatch attempts for this technician
      const { data: attempts, error: attemptsError } = await supabase
        .from('dispatch_attempts')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('status', 'pending')
        .not('notified_at', 'is', null);

      if (attemptsError) throw attemptsError;

      if (!attempts || attempts.length === 0) {
        setInterventions([]);
        return;
      }

      // Get the interventions for these attempts
      const interventionIds = attempts.map(a => a.intervention_id);
      const { data: interventionsData, error: interventionsError } = await supabase
        .from('interventions')
        .select('*')
        .in('id', interventionIds)
        .eq('is_active', true);

      if (interventionsError) throw interventionsError;

      // Combine intervention data with attempt data
      const availableInterventions: AvailableIntervention[] = (interventionsData || []).map(int => {
        const attempt = attempts.find(a => a.intervention_id === int.id);
        const scoreBreakdown = attempt?.score_breakdown as { proximity?: number } | undefined;
        
        return {
          id: int.id,
          clientId: int.client_id,
          technicianId: int.technician_id,
          category: int.category as InterventionCategory,
          priority: int.priority,
          status: int.status as InterventionStatus,
          title: int.title,
          description: int.description || '',
          address: int.address,
          city: int.city,
          postalCode: int.postal_code,
          latitude: int.latitude,
          longitude: int.longitude,
          estimatedPrice: int.estimated_price,
          finalPrice: int.final_price,
          scheduledAt: int.scheduled_at,
          startedAt: int.started_at,
          completedAt: int.completed_at,
          photos: int.photos || undefined,
          isActive: int.is_active,
          createdAt: int.created_at,
          updatedAt: int.updated_at,
          trackingCode: int.tracking_code,
          clientEmail: int.client_email,
          clientPhone: int.client_phone,
          score: attempt?.score || 0,
          attemptOrder: attempt?.attempt_order || 1,
          distanceKm: scoreBreakdown?.proximity ? Math.round((100 - scoreBreakdown.proximity) / 2 * 10) / 10 : undefined,
        };
      });

      // Sort by score (highest first)
      availableInterventions.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      setInterventions(availableInterventions);
    } catch (err) {
      console.error('Error fetching available interventions:', err);
      setError('Impossible de charger les interventions disponibles');
    } finally {
      setIsLoading(false);
    }
  }, [technicianId]);

  // Check if technician has an active intervention
  const checkActiveIntervention = useCallback(async () => {
    const { data } = await supabase
      .from('interventions')
      .select('id')
      .eq('technician_id', technicianId)
      .in('status', ['assigned', 'en_route', 'in_progress'])
      .eq('is_active', true)
      .limit(1);

    if (data && data.length > 0) {
      setAcceptedInterventionId(data[0].id);
    } else {
      setAcceptedInterventionId(null);
    }
  }, [technicianId]);

  useEffect(() => {
    fetchAvailableInterventions();
    checkActiveIntervention();
  }, [fetchAvailableInterventions, checkActiveIntervention]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('available-interventions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_attempts',
          filter: `technician_id=eq.${technicianId}`,
        },
        () => {
          fetchAvailableInterventions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
        },
        () => {
          fetchAvailableInterventions();
          checkActiveIntervention();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [technicianId, fetchAvailableInterventions, checkActiveIntervention]);

  const openConfirmDialog = (action: typeof dialogAction, intervention: AvailableIntervention) => {
    setDialogAction(action);
    setSelectedIntervention(intervention);
    setDialogOpen(true);
  };

  const handleDecline = async (reason: string) => {
    if (!selectedIntervention) return;
    
    setProcessingId(selectedIntervention.id);
    try {
      const result = await dispatchService.declineIntervention(selectedIntervention.id, technicianId, reason);
      if (result.success) {
        toast.success('Intervention refusée');
        fetchAvailableInterventions();
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error declining:', err);
      toast.error('Erreur lors du refus');
    } finally {
      setProcessingId(null);
      setDialogOpen(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedIntervention) return;
    
    setProcessingId(selectedIntervention.id);
    try {
      const result = await dispatchService.acceptAssignment(selectedIntervention.id, technicianId);
      if (result.success) {
        toast.success('Intervention acceptée !', {
          description: 'Vous pouvez maintenant démarrer ou annuler.',
        });
        setAcceptedInterventionId(selectedIntervention.id);
        onInterventionAccepted?.(selectedIntervention);
        fetchAvailableInterventions();
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error accepting:', err);
      toast.error('Erreur lors de l\'acceptation');
    } finally {
      setProcessingId(null);
      setDialogOpen(false);
    }
  };

  const handleGo = async () => {
    if (!selectedIntervention) return;
    
    setProcessingId(selectedIntervention.id);
    try {
      const result = await dispatchService.goToIntervention(selectedIntervention.id, technicianId);
      if (result.success) {
        toast.success('En route !', {
          description: 'Navigation vers le lieu d\'intervention.',
        });
        setAcceptedInterventionId(selectedIntervention.id);
        // Navigate to map/tracking page
        navigate(`/intervention/${selectedIntervention.id}`);
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error going:', err);
      toast.error('Erreur lors du démarrage');
    } finally {
      setProcessingId(null);
      setDialogOpen(false);
    }
  };

  const handleEnRoute = async () => {
    if (!selectedIntervention) return;
    
    setProcessingId(selectedIntervention.id);
    try {
      const result = await dispatchService.goToIntervention(selectedIntervention.id, technicianId);
      if (result.success) {
        toast.success('En route !');
        navigate(`/intervention/${selectedIntervention.id}`);
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error setting en route:', err);
      toast.error('Erreur');
    } finally {
      setProcessingId(null);
      setDialogOpen(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!selectedIntervention) return;
    
    setProcessingId(selectedIntervention.id);
    try {
      const result = await dispatchService.cancelAssignment(selectedIntervention.id, technicianId, reason);
      if (result.success) {
        toast.info('Intervention annulée', {
          description: 'Elle sera reproposée à d\'autres techniciens.',
        });
        setAcceptedInterventionId(null);
        fetchAvailableInterventions();
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error cancelling:', err);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setProcessingId(null);
      setDialogOpen(false);
    }
  };

  const handleDialogConfirm = (reason?: string) => {
    switch (dialogAction) {
      case 'decline':
        handleDecline(reason || 'Aucun motif fourni');
        break;
      case 'accept':
        handleAccept();
        break;
      case 'go':
        handleGo();
        break;
      case 'en_route':
        handleEnRoute();
        break;
      case 'cancel':
        handleCancel(reason || 'Aucun motif fourni');
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // If technician has accepted an intervention, only show that one
  if (acceptedInterventionId) {
    const acceptedIntervention = interventions.find(i => i.id === acceptedInterventionId) ||
      // Fetch the accepted intervention if not in current list
      null;
    
    if (acceptedIntervention) {
      return (
        <div className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Vous avez une intervention en cours. Terminez-la avant d'en accepter une autre.
            </AlertDescription>
          </Alert>
          
          <AcceptedInterventionCard
            intervention={acceptedIntervention}
            isProcessing={processingId === acceptedIntervention.id}
            onEnRoute={() => openConfirmDialog('en_route', acceptedIntervention)}
            onCancel={() => openConfirmDialog('cancel', acceptedIntervention)}
            onViewDetails={() => navigate(`/intervention/${acceptedIntervention.id}`)}
          />
          
          <ConfirmActionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            action={dialogAction}
            onConfirm={handleDialogConfirm}
          />
        </div>
      );
    }
  }

  if (interventions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Aucune intervention disponible pour le moment
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          De nouvelles interventions vous seront proposées automatiquement
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Interventions disponibles</h2>
        <Badge variant="secondary">{interventions.length} disponible(s)</Badge>
      </div>

      <div className="grid gap-4">
        {interventions.map((intervention) => (
          <AvailableInterventionCard
            key={intervention.id}
            intervention={intervention}
            isProcessing={processingId === intervention.id}
            onDecline={() => openConfirmDialog('decline', intervention)}
            onAccept={() => openConfirmDialog('accept', intervention)}
            onGo={() => openConfirmDialog('go', intervention)}
          />
        ))}
      </div>

      <ConfirmActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        onConfirm={handleDialogConfirm}
      />
    </div>
  );
}

// Card for available intervention with 3 action buttons
function AvailableInterventionCard({
  intervention,
  isProcessing,
  onDecline,
  onAccept,
  onGo,
}: {
  intervention: AvailableIntervention;
  isProcessing: boolean;
  onDecline: () => void;
  onAccept: () => void;
  onGo: () => void;
}) {
  const categoryLabel = CATEGORY_LABELS[intervention.category as keyof typeof CATEGORY_LABELS] || intervention.category;
  const categoryIcon = CATEGORY_ICONS[intervention.category as keyof typeof CATEGORY_ICONS] || '🔧';
  const priorityLabel = PRIORITY_LABELS[intervention.priority as keyof typeof PRIORITY_LABELS] || intervention.priority;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <CardTitle className="text-base">{categoryLabel}</CardTitle>
              <p className="text-sm text-muted-foreground">{intervention.title}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={intervention.priority === 'urgent' ? 'destructive' : 'secondary'}>
              {priorityLabel}
            </Badge>
            {intervention.score && (
              <span className="text-xs text-muted-foreground">
                Score: {intervention.score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pb-2">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <span>
            {intervention.address}, {intervention.postalCode} {intervention.city}
          </span>
        </div>
        
        {intervention.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {intervention.description}
          </p>
        )}

        {intervention.distanceKm !== undefined && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>📍 ~{intervention.distanceKm} km</span>
            <span>⏱️ ~{Math.round((intervention.distanceKm / 40) * 60)} min</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDecline}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-1" />
          Refuser
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={onAccept}
          disabled={isProcessing}
        >
          <Check className="h-4 w-4 mr-1" />
          Accepter
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={onGo}
          disabled={isProcessing}
        >
          <Navigation className="h-4 w-4 mr-1" />
          Y aller
        </Button>
      </CardFooter>
    </Card>
  );
}

// Card for accepted intervention with En route / Cancel buttons
function AcceptedInterventionCard({
  intervention,
  isProcessing,
  onEnRoute,
  onCancel,
  onViewDetails,
}: {
  intervention: AvailableIntervention;
  isProcessing: boolean;
  onEnRoute: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
}) {
  const categoryLabel = CATEGORY_LABELS[intervention.category as keyof typeof CATEGORY_LABELS] || intervention.category;
  const categoryIcon = CATEGORY_ICONS[intervention.category as keyof typeof CATEGORY_ICONS] || '🔧';

  const isEnRoute = intervention.status === 'en_route';

  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <CardTitle className="text-base">{categoryLabel}</CardTitle>
              <p className="text-sm text-muted-foreground">{intervention.title}</p>
            </div>
          </div>
          <Badge variant="default">
            {isEnRoute ? 'En route' : 'Acceptée'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2 pb-2">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <span>
            {intervention.address}, {intervention.postalCode} {intervention.city}
          </span>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-2">
        {!isEnRoute && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onCancel}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
        )}
        {!isEnRoute ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={onEnRoute}
            disabled={isProcessing}
          >
            <Navigation className="h-4 w-4 mr-1" />
            En route
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={onViewDetails}
            disabled={isProcessing}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Voir détails
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
