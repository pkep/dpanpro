import { useState, useEffect } from 'react';
import { Intervention, InterventionStatus, STATUS_LABELS } from '@/types/intervention.types';
import { interventionsService } from '@/services/interventions/interventions.service';
import { InterventionCard } from './InterventionCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Inbox } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InterventionsListProps {
  clientId: string;
  onInterventionClick?: (intervention: Intervention) => void;
}

type TabValue = 'all' | 'active' | 'completed';

export function InterventionsList({ clientId, onInterventionClick }: InterventionsListProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  useEffect(() => {
    const fetchInterventions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await interventionsService.getInterventions({
          clientId,
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
  }, [clientId]);

  const filterInterventions = (tab: TabValue): Intervention[] => {
    switch (tab) {
      case 'active':
        return interventions.filter(
          (i) => !['completed', 'cancelled'].includes(i.status)
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
          <TabsTrigger value="all">
            Toutes ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="active">
            En cours ({getTabCount('active')})
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
                {activeTab === 'all' 
                  ? "Aucune intervention pour le moment"
                  : activeTab === 'active'
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
                  onClick={() => onInterventionClick?.(intervention)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
