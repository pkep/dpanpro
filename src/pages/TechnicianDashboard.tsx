import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianInterventionsList } from '@/components/interventions/TechnicianInterventionsList';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { ProximitySettings } from '@/components/notifications/ProximitySettings';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { TechnicianRating } from '@/components/ratings/TechnicianRating';
import { DispatchAssignmentCard } from '@/components/dispatch/DispatchAssignmentCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Home, Wrench, CheckCircle, Clock, AlertTriangle, Map, Radio, Star, MapPin } from 'lucide-react';
import { interventionsService } from '@/services/interventions/interventions.service';
import { useTechnicianGeolocation } from '@/hooks/useTechnicianGeolocation';
import { useTechnicianPushNotifications } from '@/hooks/useFirebaseMessaging';
import type { Intervention } from '@/types/intervention.types';

const TechnicianDashboard = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const geolocation = useTechnicianGeolocation(); // Auto-tracks technician location
  useTechnicianPushNotifications(); // Enable push notifications for technicians
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    completedToday: 0,
    urgent: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        const interventions = await interventionsService.getInterventions({
          technicianId: user.id,
          isActive: true,
        });

        const today = new Date().toDateString();
        
        setStats({
          assigned: interventions.filter(i => ['assigned', 'en_route'].includes(i.status)).length,
          inProgress: interventions.filter(i => i.status === 'in_progress').length,
          completedToday: interventions.filter(i => 
            i.status === 'completed' && 
            i.completedAt && 
            new Date(i.completedAt).toDateString() === today
          ).length,
          urgent: interventions.filter(i => 
            i.priority === 'urgent' && 
            !['completed', 'cancelled'].includes(i.status)
          ).length,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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

  // Check if user is a technician
  if (user.role !== 'technician' && user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cette page est réservée aux techniciens.
            </p>
            <Button asChild className="w-full">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Technicien</p>
                <TechnicianRating technicianId={user.id} size="sm" showCount={false} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <Button variant="outline" size="sm" asChild>
              <Link to="/map">
                <Map className="h-4 w-4 mr-2" />
                Carte
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/live-tracking">
                <Radio className="h-4 w-4 mr-2" />
                Suivi GPS
              </Link>
            </Button>
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
      <main className="container px-4 py-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignées</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assigned}</div>
              <p className="text-xs text-muted-foreground">interventions à traiter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En cours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">intervention(s) active(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terminées aujourd'hui</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">intervention(s) complétée(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
              <p className="text-xs text-muted-foreground">priorité haute</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ma note moyenne</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <TechnicianRating technicianId={user.id} size="lg" showCount={true} />
          </CardContent>
        </Card>

        {/* Proximity Settings and Interventions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Mes interventions</h1>
              <p className="text-muted-foreground">
                Gérez les interventions qui vous sont assignées
              </p>
            </div>

            <TechnicianInterventionsList 
              technicianId={user.id}
            />
          </div>

          <div className="space-y-4">
            {/* Pending Assignment Card */}
            <DispatchAssignmentCard />
            
            {/* Location Status Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ma position</CardTitle>
                <MapPin className={`h-4 w-4 ${geolocation.isTracking ? 'text-green-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                {geolocation.isTracking ? (
                  <>
                    <p className="text-sm font-medium">{geolocation.city || 'Localisation en cours...'}</p>
                    {geolocation.department && (
                      <p className="text-xs text-muted-foreground">{geolocation.department}</p>
                    )}
                    {geolocation.lastUpdated && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Mise à jour : {geolocation.lastUpdated.toLocaleTimeString('fr-FR')}
                      </p>
                    )}
                  </>
                ) : geolocation.error ? (
                  <p className="text-xs text-destructive">{geolocation.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">En attente de localisation...</p>
                )}
              </CardContent>
            </Card>
            
            <ProximitySettings />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TechnicianDashboard;
