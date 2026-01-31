import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Map, Award, Target, Star, Loader2, Clock, Navigation, ThumbsUp, Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceKPIs {
  avgResponseTime: number | null;
  avgArrivalTime: number | null;
  avgRating: number | null;
  acceptanceRate: number | null;
  revenuePerTech: number | null;
  totalTechnicians: number;
}

export default function AdminPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<PerformanceKPIs>({
    avgResponseTime: null,
    avgArrivalTime: null,
    avgRating: null,
    acceptanceRate: null,
    revenuePerTech: null,
    totalTechnicians: 0,
  });

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      // Fetch all partner statistics
      const { data: stats, error: statsError } = await supabase
        .from('partner_statistics')
        .select('average_response_time_seconds, average_arrival_time_seconds, average_rating, total_interventions, completed_interventions');

      if (statsError) throw statsError;

      // Calculate averages across all technicians
      const validStats = stats || [];
      const totalTechnicians = validStats.length;

      // Average response time (only from technicians with data)
      const responseTimeStats = validStats.filter(s => s.average_response_time_seconds !== null);
      const avgResponseTime = responseTimeStats.length > 0
        ? responseTimeStats.reduce((sum, s) => sum + (s.average_response_time_seconds || 0), 0) / responseTimeStats.length
        : null;

      // Average arrival time
      const arrivalTimeStats = validStats.filter(s => s.average_arrival_time_seconds !== null);
      const avgArrivalTime = arrivalTimeStats.length > 0
        ? arrivalTimeStats.reduce((sum, s) => sum + (s.average_arrival_time_seconds || 0), 0) / arrivalTimeStats.length
        : null;

      // Average rating
      const ratingStats = validStats.filter(s => s.average_rating !== null);
      const avgRating = ratingStats.length > 0
        ? ratingStats.reduce((sum, s) => sum + Number(s.average_rating || 0), 0) / ratingStats.length
        : null;

      // Acceptance rate (completed / total)
      const totalInterventions = validStats.reduce((sum, s) => sum + (s.total_interventions || 0), 0);
      const completedInterventions = validStats.reduce((sum, s) => sum + (s.completed_interventions || 0), 0);
      const acceptanceRate = totalInterventions > 0
        ? (completedInterventions / totalInterventions) * 100
        : null;

      // Revenue per technician (this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: interventions, error: intError } = await supabase
        .from('interventions')
        .select('final_price, technician_id')
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString())
        .not('final_price', 'is', null);

      if (intError) throw intError;

      const totalRevenue = (interventions || []).reduce((sum, i) => sum + Number(i.final_price || 0), 0);
      const activeTechsThisMonth = new Set((interventions || []).map(i => i.technician_id)).size;
      const revenuePerTech = activeTechsThisMonth > 0 ? totalRevenue / activeTechsThisMonth : null;

      setKpis({
        avgResponseTime,
        avgArrivalTime,
        avgRating,
        acceptanceRate,
        revenuePerTech,
        totalTechnicians,
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--';
    const minutes = Math.round(seconds / 60);
    return `${minutes}`;
  };

  const getTimeStatus = (seconds: number | null, targetMinutes: number): 'good' | 'warning' | 'bad' => {
    if (seconds === null) return 'good';
    const minutes = seconds / 60;
    if (minutes <= targetMinutes) return 'good';
    if (minutes <= targetMinutes * 1.5) return 'warning';
    return 'bad';
  };

  const getRatingStatus = (rating: number | null): 'good' | 'warning' | 'bad' => {
    if (rating === null) return 'good';
    if (rating >= 4.5) return 'good';
    if (rating >= 4.0) return 'warning';
    return 'bad';
  };

  const getPercentStatus = (percent: number | null, target: number): 'good' | 'warning' | 'bad' => {
    if (percent === null) return 'good';
    if (percent >= target) return 'good';
    if (percent >= target * 0.9) return 'warning';
    return 'bad';
  };

  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    bad: 'text-red-600',
  };

  return (
    <AdminLayout title="Dashboard Performance" subtitle="KPIs et analyses">
      <div className="space-y-6">
        {/* KPIs Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Temps réponse moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">{formatTime(kpis.avgResponseTime)} min</div>
                  <p className={`text-xs ${statusColors[getTimeStatus(kpis.avgResponseTime, 30)]}`}>
                    Objectif: &lt;30 min
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                Temps arrivée moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">{formatTime(kpis.avgArrivalTime)} min</div>
                  <p className={`text-xs ${statusColors[getTimeStatus(kpis.avgArrivalTime, 45)]}`}>
                    Objectif: &lt;45 min
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="h-3 w-3" />
                Satisfaction client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold flex items-center gap-1">
                    {kpis.avgRating !== null ? kpis.avgRating.toFixed(1) : '--'}/5
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className={`text-xs ${statusColors[getRatingStatus(kpis.avgRating)]}`}>
                    Objectif: &gt;4.5
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                Taux acceptation tech.
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {kpis.acceptanceRate !== null ? kpis.acceptanceRate.toFixed(0) : '--'}%
                  </div>
                  <p className={`text-xs ${statusColors[getPercentStatus(kpis.acceptanceRate, 90)]}`}>
                    Objectif: &gt;90%
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Euro className="h-3 w-3" />
                CA/Technicien
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {kpis.revenuePerTech !== null ? `${kpis.revenuePerTech.toFixed(0)} €` : '-- €'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce mois ({kpis.totalTechnicians} techniciens)
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Rapports
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyse
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Classement
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Prévisions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Rapports</CardTitle>
                <CardDescription>
                  Export PDF/CSV quotidien, hebdomadaire, mensuel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Les options d'export de rapports seront affichées ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Analyse de performance</CardTitle>
                <CardDescription>
                  Temps de réponse, taux de résolution, satisfaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Les graphiques d'analyse seront affichés ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap">
            <Card>
              <CardHeader>
                <CardTitle>Heatmap géographique</CardTitle>
                <CardDescription>
                  Zones à forte demande
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La carte heatmap sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Classement techniciens</CardTitle>
                <CardDescription>
                  Évaluations et statistiques par technicien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Le classement des techniciens sera affiché ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>Prévisions</CardTitle>
                <CardDescription>
                  Estimation des pics de demande basée sur l'historique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Les prévisions de demande seront affichées ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
