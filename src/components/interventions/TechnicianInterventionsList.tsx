import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Intervention, InterventionStatus, STATUS_LABELS } from '@/types/intervention.types';
import { interventionsService } from '@/services/interventions/interventions.service';
import { InterventionCard } from './InterventionCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Inbox } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const handleInterventionClick = (intervention: Intervention) => {
    if (onInterventionClick) {
      onInterventionClick(intervention);
    } else {
      navigate(`/intervention/${intervention.id}`);
    }
  };

  useEffect(() => {
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
              {filteredInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.id}
                  intervention={intervention}
                  onClick={() => handleInterventionClick(intervention)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
