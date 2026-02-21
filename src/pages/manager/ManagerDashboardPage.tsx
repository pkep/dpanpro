import { useState, useEffect } from 'react';
import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, BarChart3, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

interface DashboardStats {
  totalTechnicians: number;
  totalClients: number;
  interventionsMonth: number;
  caMonth: number;
}

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTechnicians: 0,
    totalClients: 0,
    interventionsMonth: 0,
    caMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

        const [techniciansRes, clientsRes, interventionsRes, caRes] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'technician'),
          supabase.from('users').select('email').in('role', ['client', 'guest']),
          supabase.from('interventions').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
          supabase.from('interventions').select('final_price').eq('status', 'completed').gte('completed_at', thirtyDaysAgo),
        ]);

        const distinctEmails = new Set((clientsRes.data || []).map(u => u.email?.toLowerCase()));
        const totalCA = (caRes.data || []).reduce((sum, i) => sum + (Number(i.final_price) || 0), 0);

        setStats({
          totalTechnicians: techniciansRes.count || 0,
          totalClients: distinctEmails.size,
          interventionsMonth: interventionsRes.count || 0,
          caMonth: totalCA,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <ManagerLayout title="Tableau de bord" subtitle="Vue d'ensemble des opérations">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Techniciens</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalTechnicians}</div>
              <p className="text-xs text-muted-foreground">Sur la plateforme</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">Enregistrés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interventions Mois</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : stats.interventionsMonth}</div>
              <p className="text-xs text-muted-foreground">30 derniers jours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CA Mois</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(stats.caMonth)}</div>
              <p className="text-xs text-muted-foreground">30 derniers jours</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestion Techniciens
              </CardTitle>
              <CardDescription>Validations, dispatch, versements</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/manager/technicians">Accéder</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance
              </CardTitle>
              <CardDescription>KPIs, rapports, analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/manager/performance">Accéder</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Planning
              </CardTitle>
              <CardDescription>Plannings techniciens</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/manager/planning">Accéder</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>Dernières actions système</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              L'historique des actions sera affiché ici
            </p>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
}
