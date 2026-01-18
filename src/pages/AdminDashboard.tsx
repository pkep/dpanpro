import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usersService } from '@/services/users/users.service';
import { interventionsService } from '@/services/interventions/interventions.service';
import type { User } from '@/types/auth.types';
import type { Intervention } from '@/types/intervention.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTable } from '@/components/admin/UsersTable';
import { AdminInterventionsTable } from '@/components/admin/AdminInterventionsTable';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import {
  Home,
  Users,
  ClipboardList,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTechnicians: 0,
    totalClients: 0,
    totalInterventions: 0,
    pendingInterventions: 0,
    activeInterventions: 0,
    completedInterventions: 0,
    urgentInterventions: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const [users, interventions] = await Promise.all([
        usersService.getUsers(),
        interventionsService.getInterventions(),
      ]);

      setStats({
        totalUsers: users.length,
        totalTechnicians: users.filter((u) => u.role === 'technician').length,
        totalClients: users.filter((u) => u.role === 'client').length,
        totalInterventions: interventions.length,
        pendingInterventions: interventions.filter((i) => i.status === 'new').length,
        activeInterventions: interventions.filter((i) => ['assigned', 'en_route', 'in_progress'].includes(i.status)).length,
        completedInterventions: interventions.filter((i) => i.status === 'completed').length,
        urgentInterventions: interventions.filter((i) => i.priority === 'urgent' && i.status !== 'completed').length,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Administration</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenue, {user.firstName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <Button variant="outline" asChild>
              <Link to="/statistics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistiques
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalClients} clients, {stats.totalTechnicians} techniciens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Interventions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats.totalInterventions}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingInterventions} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? '...' : stats.activeInterventions}
              </div>
              <p className="text-xs text-muted-foreground">
                Interventions actives
              </p>
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
              <div className="text-2xl font-bold text-destructive">
                {statsLoading ? '...' : stats.urgentInterventions}
              </div>
              <p className="text-xs text-muted-foreground">
                À traiter en priorité
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Users and Interventions */}
        <Tabs defaultValue="interventions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="interventions" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Interventions
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interventions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Toutes les interventions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdminInterventionsTable onInterventionUpdated={fetchStats} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UsersTable onUserUpdated={fetchStats} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
