import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '@/services/performance/performance.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function PerformanceAnalysisTab() {
  const { data: trends, isLoading } = useQuery({
    queryKey: ['performance-trends'],
    queryFn: () => performanceService.getPerformanceTrends(30),
  });

  const formatXAxis = (value: string) => {
    try {
      return format(parseISO(value), 'dd/MM', { locale: fr });
    } catch {
      return value;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse de Performance</CardTitle>
        <CardDescription>Évolution sur les 30 derniers jours</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : trends && trends.length > 0 ? (
          <div className="space-y-8">
            {/* Response Time Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4">Temps de réponse moyen (minutes)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatXAxis}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => {
                        try {
                          return format(parseISO(value as string), 'dd MMMM yyyy', { locale: fr });
                        } catch {
                          return value;
                        }
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgResponseTime" 
                      name="Temps de réponse (min)"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resolution Rate Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4">Taux de résolution (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatXAxis}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => {
                        try {
                          return format(parseISO(value as string), 'dd MMMM yyyy', { locale: fr });
                        } catch {
                          return value;
                        }
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="resolutionRate" 
                      name="Taux de résolution (%)"
                      stroke="hsl(var(--info))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Satisfaction Chart */}
            <div>
              <h3 className="text-sm font-medium mb-4">Satisfaction client (note /5)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatXAxis}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={[0, 5]}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => {
                        try {
                          return format(parseISO(value as string), 'dd MMMM yyyy', { locale: fr });
                        } catch {
                          return value;
                        }
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgSatisfaction" 
                      name="Note moyenne"
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
