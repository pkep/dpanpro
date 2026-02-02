import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { cancellationService } from '@/services/cancellation/cancellation.service';
import { invoiceService } from '@/services/invoice/invoice.service';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS, CATEGORY_ICONS } from '@/types/intervention.types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Plus, 
  LogOut, 
  Home, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  History,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  Download,
  Loader2,
  XCircle,
} from 'lucide-react';
import { ClientCancelDialog } from '@/components/interventions/ClientCancelDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  urgent: number;
}

const Dashboard = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
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

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedIntervention) return;
    
    setIsCancelling(true);
    try {
      const result = await cancellationService.cancelInterventionWithFees(selectedIntervention.id, reason);
      if (result.success) {
        if (result.hasFees) {
          toast.success('Demande annulée', {
            description: `Frais de déplacement de ${result.feeAmount?.toFixed(2)} € facturés.`,
          });
        } else {
          toast.success('Demande annulée avec succès');
        }
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
      } else {
        toast.error('Erreur lors de l\'annulation', { description: result.error });
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
    return ['new', 'assigned', 'on_route', 'arrived', 'in_progress'].includes(intervention.status);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

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
          active: data.filter(i => ['assigned', 'en_route', 'in_progress'].includes(i.status)).length,
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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'in_progress': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'en_route': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
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
      case 'en_route': return 50;
      case 'in_progress': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  // Filter interventions
  const activeInterventions = interventions.filter(i => 
    ['new', 'assigned', 'en_route', 'in_progress'].includes(i.status)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedInterventions = interventions.filter(i => 
    i.status === 'completed'
  ).sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

  const recentInterventions = [...interventions]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm bg-primary text-primary-foreground font-semibold">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground">Espace Client</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bonjour, {user.firstName} 👋</h1>
            <p className="text-muted-foreground">
              Voici le récapitulatif de vos interventions
            </p>
          </div>
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

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Interventions */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  En cours ({activeInterventions.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique ({completedInterventions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
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
                  activeInterventions.map((intervention) => (
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
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : completedInterventions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <History className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-1">Aucun historique</h3>
                      <p className="text-muted-foreground text-center">
                        Vos interventions terminées apparaîtront ici
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  completedInterventions.map((intervention) => (
                    <Card key={intervention.id} className="hover:shadow-md transition-shadow opacity-90">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-xl opacity-70">{CATEGORY_ICONS[intervention.category]}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{intervention.title}</h3>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span>{CATEGORY_LABELS[intervention.category]}</span>
                                <span>•</span>
                                <span>{intervention.city}</span>
                                <span>•</span>
                                <span>
                                  Terminée le {intervention.completedAt && format(new Date(intervention.completedAt), 'dd MMM yyyy', { locale: fr })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Terminée
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadInvoice(intervention)}
                              disabled={downloadingInvoice === intervention.id}
                            >
                              {downloadingInvoice === intervention.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/intervention/${intervention.id}`}>
                                <FileText className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/new-intervention">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle intervention
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Activité récente
                </CardTitle>
                <CardDescription>Dernières mises à jour</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : recentInterventions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune activité récente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentInterventions.map((intervention) => (
                      <Link
                        key={intervention.id}
                        to={`/intervention/${intervention.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-lg">{CATEGORY_ICONS[intervention.category]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{intervention.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(intervention.updatedAt), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className={`${getStatusColor(intervention.status)} text-xs`}>
                          {intervention.status === 'new' ? 'Demande reçue' : STATUS_LABELS[intervention.status]}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion Rate */}
            {stats.total > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Taux de complétion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">
                        {Math.round((stats.completed / stats.total) * 100)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {stats.completed} / {stats.total}
                      </span>
                    </div>
                    <Progress 
                      value={(stats.completed / stats.total) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      de vos interventions sont terminées
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Dialog */}
      {selectedIntervention && (
        <ClientCancelDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleCancelConfirm}
          interventionId={selectedIntervention.id}
          interventionStatus={selectedIntervention.status}
          interventionCategory={selectedIntervention.category}
          isProcessing={isCancelling}
        />
      )}
    </div>
  );
};

export default Dashboard;
