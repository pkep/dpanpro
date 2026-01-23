import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Intervention, InterventionStatus, STATUS_LABELS, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { interventionsService } from '@/services/interventions/interventions.service';
import { dispatchService } from '@/services/dispatch/dispatch.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Inbox, MapPin, XCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { toast } from 'sonner';

interface TechnicianInterventionsListProps {
  technicianId: string;
  onInterventionClick?: (intervention: Intervention) => void;
}

type TabValue = 'assigned' | 'in_progress' | 'completed';

export function TechnicianInterventionsList({ technicianId, onInterventionClick }: TechnicianInterventionsListProps) {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('assigned');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInterventionClick = (intervention: Intervention) => {
    if (onInterventionClick) {
      onInterventionClick(intervention);
    } else {
      navigate(`/technician/intervention/${intervention.id}`);
    }
  };

  const handleCancelClick = (e: React.MouseEvent, intervention: Intervention) => {
    e.stopPropagation();
    setSelectedIntervention(intervention);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (!selectedIntervention || !reason) return;
    
    setIsProcessing(true);
    try {
      const result = await dispatchService.cancelAssignment(selectedIntervention.id, technicianId, reason);
      if (result.success) {
        toast.success('Intervention annulée', {
          description: 'Elle sera reproposée à d\'autres techniciens.',
        });
        fetchInterventions();
      } else {
        toast.error('Erreur', { description: result.message });
      }
    } catch (err) {
      console.error('Error cancelling intervention:', err);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setIsProcessing(false);
      setCancelDialogOpen(false);
      setSelectedIntervention(null);
    }
  };

  const fetchInterventions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await interventionsService.getInterventions({
        technicianId,
        isActive: true,
      });
      setInterventions(data);
    } catch (err) {
      console.error('Error fetching interventions:', err);
      setError('Impossible de charger les interventions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [technicianId]);

  const filterInterventions = (tab: TabValue): Intervention[] => {
    switch (tab) {
      case 'assigned':
        return interventions.filter(
          (i) => ['assigned', 'en_route'].includes(i.status)
        );
      case 'in_progress':
        return interventions.filter(
          (i) => i.status === 'in_progress'
        );
      case 'completed':
        return interventions.filter(
          (i) => ['completed', 'cancelled'].includes(i.status)
        );
      default:
        return interventions;
    }
  };

  const getTabCount = (tab: TabValue): number => {
    return filterInterventions(tab).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
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

  const filteredInterventions = filterInterventions(activeTab);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assigned">
            Assignées ({getTabCount('assigned')})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            En cours ({getTabCount('in_progress')})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminées ({getTabCount('completed')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredInterventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'assigned' 
                  ? "Aucune intervention assignée"
                  : activeTab === 'in_progress'
                  ? "Aucune intervention en cours"
                  : "Aucune intervention terminée"
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredInterventions.map((intervention) => {
                const canCancel = ['assigned', 'on_route'].includes(intervention.status);
                const categoryIcon = CATEGORY_ICONS[intervention.category] || '🔧';
                const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
                
                return (
                  <Card 
                    key={intervention.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleInterventionClick(intervention)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{categoryIcon}</span>
                          <span className="font-medium">{categoryLabel}</span>
                        </div>
                        <Badge variant="outline">{STATUS_LABELS[intervention.status]}</Badge>
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{intervention.address}, {intervention.postalCode} {intervention.city}</span>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInterventionClick(intervention);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </Button>
                        
                        {canCancel && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => handleCancelClick(e, intervention)}
                            disabled={isProcessing}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Annuler
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        action="cancel_intervention"
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
