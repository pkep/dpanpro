import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { usersService } from '@/services/users/users.service';
import type { Intervention } from '@/types/intervention.types';
import type { User } from '@/types/auth.types';
import { CATEGORY_ICONS, STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS } from '@/types/intervention.types';
import { PlanningCalendar } from '@/components/planning/PlanningCalendar';
import { ScheduleInterventionDialog } from '@/components/planning/ScheduleInterventionDialog';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Home,
  Calendar,
  ClipboardList,
  CalendarPlus,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

export default function PlanningPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [unscheduledInterventions, setUnscheduledInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [interventionsData, techniciansData] = await Promise.all([
        interventionsService.getInterventions({ isActive: true }),
        usersService.getTechnicians(),
      ]);
      
      // Filter unscheduled interventions
      const unscheduled = interventionsData.filter(
        (i) => !i.scheduledAt && !['completed', 'cancelled'].includes(i.status)
      );
      setUnscheduledInterventions(unscheduled);
      setTechnicians(techniciansData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, refreshKey]);

  const handleInterventionClick = (intervention: Intervention) => {
    navigate(`/intervention/${intervention.id}`);
  };

  const handleScheduleClick = (intervention: Intervention) => {
    setSelectedIntervention(intervention);
    setScheduleDialogOpen(true);
  };

  const handleScheduled = () => {
    setRefreshKey((k) => k + 1);
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Planning</h1>
              <p className="text-sm text-muted-foreground">
                Planification des interventions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <Button variant="outline" asChild>
              <Link to="/admin">
                <ClipboardList className="mr-2 h-4 w-4" />
                Admin
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

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Unscheduled Interventions Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  À planifier
                </CardTitle>
                <CardDescription>
                  {loading ? '...' : `${unscheduledInterventions.length} intervention(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : unscheduledInterventions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Toutes les interventions sont planifiées
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="p-2 space-y-2">
                      {unscheduledInterventions.map((intervention) => (
                        <Card
                          key={intervention.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <span>{CATEGORY_ICONS[intervention.category]}</span>
                                <span className="text-sm font-medium truncate max-w-[120px]">
                                  {intervention.title}
                                </span>
                              </div>
                              {intervention.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{intervention.city}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-7"
                                onClick={() => handleInterventionClick(intervention)}
                              >
                                Détails
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 text-xs h-7"
                                onClick={() => handleScheduleClick(intervention)}
                              >
                                <CalendarPlus className="h-3 w-3 mr-1" />
                                Planifier
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendrier des interventions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlanningCalendar
                  key={refreshKey}
                  onInterventionClick={handleInterventionClick}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Schedule Dialog */}
      <ScheduleInterventionDialog
        intervention={selectedIntervention}
        technicians={technicians}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onScheduled={handleScheduled}
      />
    </div>
  );
}
