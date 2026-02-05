import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { AvailableInterventionsList } from '@/components/interventions/AvailableInterventionsList';
import { ProximitySettings } from '@/components/notifications/ProximitySettings';
import { TechnicianRating } from '@/components/ratings/TechnicianRating';
import { DispatchAssignmentCard } from '@/components/dispatch/DispatchAssignmentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, CheckCircle, Clock, AlertTriangle, Star, MapPin, Play } from 'lucide-react';
import { interventionsService } from '@/services/interventions/interventions.service';
import { useTechnicianGeolocation } from '@/hooks/useTechnicianGeolocation';
import { useTechnicianPushNotifications } from '@/hooks/useFirebaseMessaging';
import type { Intervention } from '@/types/intervention.types';

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const geolocation = useTechnicianGeolocation();
  useTechnicianPushNotifications();
  
  const [stats, setStats] = useState({
    inProgress: 0,
    completedToday: 0,
    urgent: 0,
  });
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        const interventions = await interventionsService.getInterventions({
          technicianId: user.id,
          isActive: true,
        });

        const today = new Date().toDateString();
        
        const active = interventions.find(i => 
          ['assigned', 'on_route', 'arrived', 'in_progress'].includes(i.status)
        );
        setActiveIntervention(active || null);
        
        const inProgressCount = interventions.filter(i => 
          ['assigned', 'on_route', 'arrived', 'in_progress'].includes(i.status)
        ).length;
        
        setStats({
          inProgress: inProgressCount,
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

  if (!user) return null;

  return (
    <TechnicianLayout title="Tableau de bord" subtitle="Gérez vos interventions">
      {/* Active Intervention Banner */}
      {activeIntervention && (
        <Card className="mb-6 border-primary bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">Intervention en cours</p>
                  <p className="text-sm text-muted-foreground truncate">{activeIntervention.title}</p>
                </div>
              </div>
              <Button onClick={() => navigate(`/technician/intervention/${activeIntervention.id}`)} className="w-full sm:w-auto shrink-0">
                <Play className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
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
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ma note moyenne</CardTitle>
          <Star className="h-4 w-4 text-yellow-400" />
        </CardHeader>
        <CardContent>
          <TechnicianRating technicianId={user.id} size="lg" showCount={true} />
        </CardContent>
      </Card>

      {/* Interventions and Settings */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeIntervention ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">Mission en cours</h2>
              <p className="text-muted-foreground mb-4">
                Vous avez une intervention active. Les nouvelles missions seront disponibles une fois celle-ci terminée.
              </p>
              <Button onClick={() => navigate(`/technician/intervention/${activeIntervention.id}`)}>
                <Play className="h-4 w-4 mr-2" />
                Reprendre l'intervention
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold">Interventions disponibles</h2>
                <p className="text-muted-foreground text-sm">
                  Acceptez ou refusez les interventions proposées
                </p>
              </div>
              <AvailableInterventionsList technicianId={user.id} />
            </>
          )}
        </div>

        <div className="space-y-4">
          {!activeIntervention && <DispatchAssignmentCard />}
          
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
    </TechnicianLayout>
  );
};

export default TechnicianDashboard;
