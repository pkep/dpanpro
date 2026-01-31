import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scheduleService, type TechnicianSchedule, type ScheduleOverride } from '@/services/schedule/schedule.service';
import { interventionsService } from '@/services/interventions/interventions.service';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_ICONS, STATUS_LABELS } from '@/types/intervention.types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, CalendarDays, CalendarRange, User } from 'lucide-react';

interface TechnicianInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TechnicianScheduleModalProps {
  technician: TechnicianInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TechnicianScheduleModal({ technician, open, onOpenChange }: TechnicianScheduleModalProps) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<TechnicianSchedule[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!technician || !open) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch schedule
        const scheduleData = await scheduleService.getSchedule(technician.id);
        setSchedule(scheduleData);

        // Determine date range based on view
        let startDate: Date;
        let endDate: Date;

        if (view === 'day') {
          startDate = currentDate;
          endDate = currentDate;
        } else if (view === 'week') {
          startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
          endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
        }

        // Fetch overrides for the period
        const overridesData = await scheduleService.getOverrides(technician.id, startDate, endDate);
        setOverrides(overridesData);

        // Fetch interventions for the technician
        const allInterventions = await interventionsService.getInterventions({ isActive: true });
        const techInterventions = allInterventions.filter(
          (i) => i.technicianId === technician.id
        );
        setInterventions(techInterventions);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [technician, open, view, currentDate]);

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedule.find((s) => s.dayOfWeek === dayOfWeek);
  };

  const getOverrideForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return overrides.find((o) => o.overrideDate === dateStr);
  };

  const getInterventionsForDate = (date: Date) => {
    return interventions.filter((intervention) => {
      const scheduledDate = intervention.scheduledAt
        ? new Date(intervention.scheduledAt)
        : new Date(intervention.createdAt);
      return isSameDay(scheduledDate, date);
    });
  };

  const isWorkingDay = (date: Date) => {
    const override = getOverrideForDate(date);
    if (override) return override.isAvailable;

    const daySchedule = getScheduleForDay(date.getDay());
    return daySchedule?.isWorkingDay ?? true;
  };

  const getWorkingHours = (date: Date) => {
    const override = getOverrideForDate(date);
    if (override && override.startTime && override.endTime) {
      return `${override.startTime.slice(0, 5)} - ${override.endTime.slice(0, 5)}`;
    }

    const daySchedule = getScheduleForDay(date.getDay());
    if (daySchedule && daySchedule.isWorkingDay) {
      return `${daySchedule.startTime.slice(0, 5)} - ${daySchedule.endTime.slice(0, 5)}`;
    }

    return null;
  };

  const renderTitle = () => {
    if (view === 'day') {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: fr });
    }
  };

  const renderDayView = () => {
    const dayInterventions = getInterventionsForDate(currentDate);
    const working = isWorkingDay(currentDate);
    const hours = getWorkingHours(currentDate);
    const override = getOverrideForDate(currentDate);

    return (
      <div className="space-y-4">
        <div className={cn(
          'p-4 rounded-lg border',
          working ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={working ? 'default' : 'destructive'}>
                {working ? 'Disponible' : 'Indisponible'}
              </Badge>
              {hours && <span className="ml-2 text-sm text-muted-foreground">{hours}</span>}
            </div>
            {override?.reason && (
              <span className="text-sm text-muted-foreground italic">{override.reason}</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Interventions ({dayInterventions.length})</h4>
          {dayInterventions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucune intervention prévue
            </p>
          ) : (
            <div className="space-y-2">
              {dayInterventions.map((intervention) => (
                <div key={intervention.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{CATEGORY_ICONS[intervention.category]}</span>
                    <span className="font-medium">{intervention.title}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {STATUS_LABELS[intervention.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {intervention.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(intervention.scheduledAt), 'HH:mm')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {intervention.city}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const working = isWorkingDay(day);
          const hours = getWorkingHours(day);
          const dayInterventions = getInterventionsForDate(day);
          const override = getOverrideForDate(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'p-2 rounded-lg border min-h-[150px]',
                isToday(day) && 'ring-2 ring-primary',
                working ? 'bg-background' : 'bg-muted/50'
              )}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={cn(
                  'text-lg font-semibold',
                  isToday(day) && 'text-primary'
                )}>
                  {format(day, 'd')}
                </div>
              </div>

              {!working ? (
                <Badge variant="destructive" className="w-full justify-center text-xs">
                  {override?.reason || 'Repos'}
                </Badge>
              ) : (
                <>
                  {hours && (
                    <div className="text-xs text-center text-muted-foreground mb-2">
                      {hours}
                    </div>
                  )}
                  <div className="space-y-1">
                    {dayInterventions.slice(0, 3).map((intervention) => (
                      <div
                        key={intervention.id}
                        className={cn(
                          'text-xs p-1 rounded truncate',
                          intervention.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : intervention.priority === 'urgent'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        )}
                        title={intervention.title}
                      >
                        {CATEGORY_ICONS[intervention.category]} {intervention.title}
                      </div>
                    ))}
                    {dayInterventions.length > 3 && (
                      <div className="text-xs text-center text-muted-foreground">
                        +{dayInterventions.length - 3}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = (monthStart.getDay() + 6) % 7;
    const emptyDays = Array(startDayOfWeek).fill(null);
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="h-16" />
          ))}
          {days.map((day) => {
            const working = isWorkingDay(day);
            const dayInterventions = getInterventionsForDate(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'h-16 p-1 rounded border text-center',
                  isToday(day) && 'ring-2 ring-primary',
                  working ? 'bg-background' : 'bg-muted/50'
                )}
              >
                <div className={cn(
                  'text-sm font-medium',
                  isToday(day) && 'text-primary'
                )}>
                  {format(day, 'd')}
                </div>
                {!working && (
                  <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mt-1" title="Repos" />
                )}
                {dayInterventions.length > 0 && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {dayInterventions.length}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!technician) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Planning de {technician.first_name} {technician.last_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week' | 'month')} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="day" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Jour
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Semaine
              </TabsTrigger>
              <TabsTrigger value="month" className="flex items-center gap-1">
                <CalendarRange className="h-4 w-4" />
                Mois
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[200px] text-center font-medium">
                {renderTitle()}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                Aujourd'hui
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                <TabsContent value="day" className="mt-0">
                  {renderDayView()}
                </TabsContent>
                <TabsContent value="week" className="mt-0">
                  {renderWeekView()}
                </TabsContent>
                <TabsContent value="month" className="mt-0">
                  {renderMonthView()}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
