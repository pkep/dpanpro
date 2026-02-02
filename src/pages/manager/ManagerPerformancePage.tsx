import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Map, Award, Star, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceReportsTab } from '@/components/admin/performance/PerformanceReportsTab';
import { PerformanceAnalysisTab } from '@/components/admin/performance/PerformanceAnalysisTab';
import { PerformanceHeatmapTab } from '@/components/admin/performance/PerformanceHeatmapTab';
import { PerformanceRankingTab } from '@/components/admin/performance/PerformanceRankingTab';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export default function ManagerPerformancePage() {
  // Fetch aggregated KPIs
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['manager-kpis'],
    queryFn: async () => {
      // Get partner statistics for averages
      const { data: stats, error: statsError } = await supabase
        .from('partner_statistics')
        .select('average_response_time_seconds, average_arrival_time_seconds, average_rating, completed_interventions, partner_id');

      if (statsError) throw statsError;

      // Calculate averages across all technicians
      const validResponseTimes = stats?.filter(s => s.average_response_time_seconds).map(s => s.average_response_time_seconds!) || [];
      const avgResponseTime = validResponseTimes.length > 0 
        ? validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length 
        : null;

      const validArrivalTimes = stats?.filter(s => s.average_arrival_time_seconds).map(s => s.average_arrival_time_seconds!) || [];
      const avgArrivalTime = validArrivalTimes.length > 0 
        ? validArrivalTimes.reduce((a, b) => a + b, 0) / validArrivalTimes.length 
        : null;

      const validRatings = stats?.filter(s => s.average_rating).map(s => s.average_rating!) || [];
      const avgRating = validRatings.length > 0 
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length 
        : null;

      // Get dispatch attempts for acceptance rate
      const { data: attempts, error: attemptsError } = await supabase
        .from('dispatch_attempts')
        .select('status');

      if (attemptsError) throw attemptsError;

      const totalAttempts = attempts?.length || 0;
      const acceptedAttempts = attempts?.filter(a => a.status === 'accepted').length || 0;
      const acceptanceRate = totalAttempts > 0 ? (acceptedAttempts / totalAttempts) * 100 : null;

      // Get monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: interventions, error: intervError } = await supabase
        .from('interventions')
        .select('final_price, technician_id')
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString());

      if (intervError) throw intervError;

      const totalRevenue = interventions?.reduce((sum, i) => sum + (i.final_price || 0), 0) || 0;
      const technicianIds = new Set(interventions?.map(i => i.technician_id).filter(Boolean));
      const avgRevenuePerTech = technicianIds.size > 0 ? totalRevenue / technicianIds.size : 0;

      // First pass resolution rate (interventions completed without quote modification)
      const { data: completedInterventions, error: completedError } = await supabase
        .from('interventions')
        .select('id')
        .eq('status', 'completed');

      if (completedError) throw completedError;

      const { data: quoteModifications, error: quotesError } = await supabase
        .from('quote_modifications')
        .select('intervention_id');

      if (quotesError) throw quotesError;

      const interventionsWithModifications = new Set(quoteModifications?.map(q => q.intervention_id) || []);
      const firstPassResolutions = completedInterventions?.filter(i => !interventionsWithModifications.has(i.id)).length || 0;
      const totalCompleted = completedInterventions?.length || 0;
      const firstPassRate = totalCompleted > 0 ? (firstPassResolutions / totalCompleted) * 100 : null;

      return {
        avgResponseTime,
        avgArrivalTime,
        avgRating,
        acceptanceRate,
        avgRevenuePerTech,
        firstPassRate,
      };
    },
  });

  const getStatusColor = (value: number | null, target: number, isLower: boolean = true) => {
    if (value === null) return 'text-muted-foreground';
    if (isLower) {
      return value <= target ? 'text-green-600' : 'text-orange-600';
    }
    return value >= target ? 'text-green-600' : 'text-orange-600';
  };

  return (
    <ManagerLayout title="Dashboard Performance" subtitle="KPIs et analyses">
      <div className="space-y-6">
        {/* KPIs Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Temps réponse moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {formatDuration(kpis?.avgResponseTime || null)}
                  </div>
                  <p className={`text-xs ${getStatusColor(kpis?.avgResponseTime ? kpis.avgResponseTime / 60 : null, 30, true)}`}>
                    Objectif: &lt;30 min
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Temps arrivée moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {formatDuration(kpis?.avgArrivalTime || null)}
                  </div>
                  <p className={`text-xs ${getStatusColor(kpis?.avgArrivalTime ? kpis.avgArrivalTime / 60 : null, 45, true)}`}>
                    Objectif: &lt;45 min
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Taux résolution 1er passage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {kpis?.firstPassRate ? `${kpis.firstPassRate.toFixed(0)}%` : '--%'}
                  </div>
                  <p className={`text-xs ${getStatusColor(kpis?.firstPassRate || null, 85, false)}`}>
                    Objectif: &gt;85%
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Satisfaction client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold flex items-center gap-1">
                    {kpis?.avgRating ? kpis.avgRating.toFixed(1) : '--'}/5 
                    <Star className="h-4 w-4 text-yellow-500" />
                  </div>
                  <p className={`text-xs ${getStatusColor(kpis?.avgRating || null, 4.5, false)}`}>
                    Objectif: &gt;4.5
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Taux acceptation tech.
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {kpis?.acceptanceRate ? `${kpis.acceptanceRate.toFixed(0)}%` : '--%'}
                  </div>
                  <p className={`text-xs ${getStatusColor(kpis?.acceptanceRate || null, 90, false)}`}>
                    Objectif: &gt;90%
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                CA/Technicien
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {formatCurrency(kpis?.avgRevenuePerTech || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
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
          </TabsList>

          <TabsContent value="reports">
            <PerformanceReportsTab />
          </TabsContent>

          <TabsContent value="analysis">
            <PerformanceAnalysisTab />
          </TabsContent>

          <TabsContent value="heatmap">
            <PerformanceHeatmapTab />
          </TabsContent>

          <TabsContent value="ranking">
            <PerformanceRankingTab />
          </TabsContent>
        </Tabs>
      </div>
    </ManagerLayout>
  );
}
