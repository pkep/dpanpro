import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClientLayout } from '@/components/client/ClientLayout';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { invoiceService } from '@/services/invoice/invoice.service';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Plus, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  Download,
  Loader2,
  XCircle,
} from 'lucide-react';
import { ConfirmActionDialog } from '@/components/interventions/ConfirmActionDialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  urgent: number;
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    active: 0,
    completed: 0,
    pending: 0,
    urgent: 0,
  });

  const handleDownloadInvoice = async (intervention: Intervention) => {
    try {
      setDownloadingInvoice(intervention.id);
      await invoiceService.generateAndDownloadInvoice(intervention);
      toast.success('Facture téléchargée avec succès');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Erreur lors du téléchargement de la facture');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleCancelClick = (intervention: Intervention) => {
    setSelectedIntervention(intervention);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (!selectedIntervention || !reason) return;
    
    setIsCancelling(true);
    try {
      await interventionsService.cancelIntervention(selectedIntervention.id, reason);
      toast.success('Demande annulée avec succès');
      // Refresh interventions
      if (user) {
        const data = await interventionsService.getInterventions({ clientId: user.id });
        setInterventions(data);
        setStats({
          total: data.length,
          active: data.filter(i => ['assigned', 'on_route', 'in_progress'].includes(i.status)).length,
          completed: data.filter(i => i.status === 'completed').length,
          pending: data.filter(i => i.status === 'new').length,
          urgent: data.filter(i => i.priority === 'urgent' && !['completed', 'cancelled'].includes(i.status)).length,
        });
      }
    } catch (err) {
      console.error('Error cancelling intervention:', err);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setSelectedIntervention(null);
    }
  };

  const canCancelIntervention = (intervention: Intervention): boolean => {
    return ['new', 'assigned', 'on_route'].includes(intervention.status);
  };

  useEffect(() => {
    const fetchInterventions = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await interventionsService.getInterventions({ clientId: user.id });
        setInterventions(data);

        // Calculate stats
        setStats({
          total: data.length,
          active: data.filter(i => ['assigned', 'on_route', 'in_progress'].includes(i.status)).length,
          completed: data.filter(i => i.status === 'completed').length,
          pending: data.filter(i => i.status === 'new').length,
          urgent: data.filter(i => i.priority === 'urgent' && !['completed', 'cancelled'].includes(i.status)).length,
        });
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

  const getProgressForStatus = (status: string) => {
    switch (status) {
      case 'new': return 10;
      case 'assigned': return 30;
      case 'on_route': return 50;
      case 'in_progress': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  // Filter interventions
  const activeInterventions = interventions.filter(i => 
    ['new', 'assigned', 'on_route', 'in_progress'].includes(i.status)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentCompletedInterventions = interventions.filter(i => 
    i.status === 'completed'
  ).sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
   .slice(0, 3);

  if (!user) return null;

  return (
    <ClientLayout title={`Bonjour, ${user.firstName} 👋`} subtitle="Voici le récapitulatif de vos interventions">
      <div className="space-y-6">
        {/* Quick Action */}
        <div className="flex justify-end">
          <Button asChild size="lg">
            <Link to="/new-intervention">
              <Plus className="mr-2 h-5 w-5" />
              Nouvelle demande
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  En attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  En cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Terminées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Urgentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Interventions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Interventions actives</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/interventions">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : activeInterventions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Aucune intervention en cours</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Vous n'avez pas d'intervention active pour le moment
                </p>
                <Button asChild>
                  <Link to="/new-intervention">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une demande
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeInterventions.slice(0, 3).map((intervention) => (
                <Card key={intervention.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl">{CATEGORY_ICONS[intervention.category]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{intervention.title}</h3>
                            {intervention.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">Urgent</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {CATEGORY_LABELS[intervention.category]}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                          
                          {/* Progress indicator */}
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <Badge className={`${getStatusColor(intervention.status)} border text-xs`}>
                                {intervention.status === 'new' ? 'Demande reçue' : STATUS_LABELS[intervention.status]}
                              </Badge>
                              <span className="text-muted-foreground">
                                {getProgressForStatus(intervention.status)}%
                              </span>
                            </div>
                            <Progress value={getProgressForStatus(intervention.status)} className="h-1.5" />
                          </div>

                          {/* Cancel button */}
                          {canCancelIntervention(intervention) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={(e) => {
                                e.preventDefault();
                                handleCancelClick(intervention);
                              }}
                              disabled={isCancelling}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler
                            </Button>
                          )}
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
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed */}
        {recentCompletedInterventions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Dernières interventions terminées</h2>
            <div className="space-y-4">
              {recentCompletedInterventions.map((intervention) => (
                <Card key={intervention.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{CATEGORY_ICONS[intervention.category]}</div>
                        <div>
                          <h3 className="font-medium">{intervention.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {intervention.finalPrice ? `${intervention.finalPrice.toFixed(2)} €` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(intervention)}
                          disabled={downloadingInvoice === intervention.id}
                        >
                          {downloadingInvoice === intervention.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Facture
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/intervention/${intervention.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <ConfirmActionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        action="cancel_client"
        onConfirm={handleCancelConfirm}
      />
    </ClientLayout>
  );
}
