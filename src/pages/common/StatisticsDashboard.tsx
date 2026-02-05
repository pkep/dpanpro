import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { statisticsService } from '@/services/statistics/statistics.service';
import { interventionsService } from '@/services/interventions/interventions.service';
import type { DailyStats, CategoryStats, StatusStats, PerformanceStats, TechnicianStats } from '@/services/statistics/statistics.service';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types/intervention.types';
import { ExportButton } from '@/components/export/ExportButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Home,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  assigned: '#8b5cf6',
  en_route: '#f59e0b',
  in_progress: '#f97316',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export default function StatisticsDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<'7' | '14' | '30'>('30');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [daily, category, status, performance, technicians, allInterventions] = await Promise.all([
          statisticsService.getDailyStats(parseInt(period)),
          statisticsService.getCategoryStats(),
          statisticsService.getStatusStats(),
          statisticsService.getPerformanceStats(),
          statisticsService.getTechnicianStats(),
          interventionsService.getInterventions(),
        ]);
        
        setDailyStats(daily);
        setCategoryStats(category);
        setStatusStats(status);
        setPerformanceStats(performance);
        setTechnicianStats(technicians);
        setInterventions(allInterventions);
      } catch (err) {
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user, period]);

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

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const formattedDailyStats = dailyStats.map((d) => ({
    ...d,
    dateLabel: format(new Date(d.date), 'dd MMM', { locale: fr }),
  }));

  const formattedCategoryStats = categoryStats.map((c) => ({
    ...c,
    label: CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] || c.category,
  }));

  const formattedStatusStats = statusStats.map((s) => ({
    ...s,
    label: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] || s.status,
    color: STATUS_COLORS[s.status] || '#6b7280',
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4 space-y-2 sm:space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Statistiques</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Analyse des performances
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link to="/admin">
                <Home className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[140px] sm:w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="14">14 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
              </SelectContent>
            </Select>
            <ExportButton interventions={interventions} disabled={loading} />
            <Button variant="outline" size="sm" asChild className="sm:hidden">
              <Link to="/admin">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total interventions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performanceStats?.totalInterventions || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Taux de complétion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {performanceStats?.completionRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceStats?.completedInterventions || 0} terminées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Temps moyen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performanceStats?.avgResolutionTimeFormatted || '-'}
                </div>
                <p className="text-xs text-muted-foreground">de résolution</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Urgences résolues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {performanceStats?.urgentCompletionRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  sur {performanceStats?.urgentInterventions || 0} urgentes
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="evolution" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="evolution" className="flex-1 sm:flex-none text-xs sm:text-sm">Évolution</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 sm:flex-none text-xs sm:text-sm">Catégories</TabsTrigger>
            <TabsTrigger value="technicians" className="flex-1 sm:flex-none text-xs sm:text-sm">Techniciens</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Daily Interventions Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Interventions par jour
                  </CardTitle>
                  <CardDescription>
                    Nouvelles vs Terminées
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={formattedDailyStats}>
                        <defs>
                          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="dateLabel" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="created" 
                          stroke="#3b82f6" 
                          fillOpacity={1}
                          fill="url(#colorCreated)"
                          name="Créées" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completed" 
                          stroke="#22c55e" 
                          fillOpacity={1}
                          fill="url(#colorCompleted)"
                          name="Terminées" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Répartition par statut
                  </CardTitle>
                  <CardDescription>
                    Interventions actives
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={formattedStatusStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="count"
                          nameKey="label"
                          label={({ percentage }) => `${percentage}%`}
                          labelLine={false}
                        >
                          {formattedStatusStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Category Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Interventions par catégorie</CardTitle>
                  <CardDescription>Nombre total par type</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={formattedCategoryStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="label" type="category" width={100} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Bar dataKey="count" name="Interventions" radius={[0, 4, 4, 0]}>
                          {formattedCategoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par catégorie</CardTitle>
                  <CardDescription>Pourcentage du total</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={formattedCategoryStats}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="count"
                          nameKey="label"
                          label={({ label, percentage }) => `${percentage}%`}
                        >
                          {formattedCategoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="technicians">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance des techniciens
                </CardTitle>
                <CardDescription>
                  Interventions complétées et en cours par technicien
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[400px]" />
                ) : technicianStats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun technicien avec des interventions
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={technicianStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                        formatter={(value, name) => {
                          if (name === 'avgResolutionMinutes') {
                            const hours = Math.floor(Number(value) / 60);
                            const mins = Number(value) % 60;
                            return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                          }
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="completed" name="Terminées" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="inProgress" name="En cours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
