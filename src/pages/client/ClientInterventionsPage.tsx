import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClientLayout } from '@/components/client/ClientLayout';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  MapPin,
  Calendar,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ClientInterventionsPage() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterventions = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await interventionsService.getInterventions({ clientId: user.id });
        setInterventions(data);
      } catch (err) {
        console.error('Error fetching interventions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterventions();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'in_progress': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'on_route': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'assigned': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'new': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter interventions by status
  const pendingInterventions = interventions.filter(i => i.status === 'new');
  const activeInterventions = interventions.filter(i => 
    ['assigned', 'on_route', 'in_progress'].includes(i.status)
  );
  const completedInterventions = interventions.filter(i => i.status === 'completed');
  const cancelledInterventions = interventions.filter(i => i.status === 'cancelled');

  const renderInterventionCard = (intervention: Intervention) => (
    <Card key={intervention.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-2xl">{CATEGORY_ICONS[intervention.category]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{intervention.title}</h3>
                {intervention.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {CATEGORY_LABELS[intervention.category]}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {intervention.city}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(intervention.createdAt), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </span>
              </div>
              <div className="mt-2">
                <Badge className={`${getStatusColor(intervention.status)} border text-xs`}>
                  {STATUS_LABELS[intervention.status]}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/intervention/${intervention.id}`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (message: string) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <ClientLayout title="Mes interventions" subtitle="Consultez toutes vos demandes">
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs md:text-sm">
            Toutes ({interventions.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs md:text-sm">
            En attente ({pendingInterventions.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs md:text-sm">
            En cours ({activeInterventions.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs md:text-sm">
            Terminées ({completedInterventions.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs md:text-sm">
            Annulées ({cancelledInterventions.length})
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="all" className="space-y-4">
              {interventions.length === 0 
                ? renderEmptyState("Aucune intervention")
                : interventions
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(renderInterventionCard)
              }
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingInterventions.length === 0 
                ? renderEmptyState("Aucune intervention en attente")
                : pendingInterventions.map(renderInterventionCard)
              }
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {activeInterventions.length === 0 
                ? renderEmptyState("Aucune intervention en cours")
                : activeInterventions.map(renderInterventionCard)
              }
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedInterventions.length === 0 
                ? renderEmptyState("Aucune intervention terminée")
                : completedInterventions.map(renderInterventionCard)
              }
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {cancelledInterventions.length === 0 
                ? renderEmptyState("Aucune intervention annulée")
                : cancelledInterventions.map(renderInterventionCard)
              }
            </TabsContent>
          </>
        )}
      </Tabs>
    </ClientLayout>
  );
}
