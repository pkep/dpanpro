import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { interventionsService } from '@/services/interventions/interventions.service';
import { usersService } from '@/services/users/users.service';
import type { Intervention } from '@/types/intervention.types';
import type { User } from '@/types/auth.types';
import { CATEGORY_ICONS, STATUS_LABELS, CATEGORY_LABELS } from '@/types/intervention.types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User as UserIcon } from 'lucide-react';

interface PlanningCalendarProps {
  onInterventionClick?: (intervention: Intervention) => void;
}

export function PlanningCalendar({ onInterventionClick }: PlanningCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [interventionsData, techniciansData] = await Promise.all([
          interventionsService.getInterventions({ isActive: true }),
          usersService.getTechnicians(),
        ]);
        setInterventions(interventionsData);
        setTechnicians(techniciansData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset (Monday = 0)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7;
  const emptyDays = Array(startDayOfWeek).fill(null);

  const filteredInterventions = selectedTechnician === 'all'
    ? interventions
    : interventions.filter((i) => i.technicianId === selectedTechnician);

  const getInterventionsForDate = (date: Date) => {
    return filteredInterventions.filter((intervention) => {
      const scheduledDate = intervention.scheduledAt 
        ? new Date(intervention.scheduledAt)
        : new Date(intervention.createdAt);
      return isSameDay(scheduledDate, date);
    });
  };

  const getTechnicianName = (technicianId: string | null | undefined) => {
    if (!technicianId) return 'Non assigné';
    const tech = technicians.find((t) => t.id === technicianId);
    return tech ? `${tech.firstName} ${tech.lastName}` : 'Inconnu';
  };

  const selectedDateInterventions = selectedDate 
    ? getInterventionsForDate(selectedDate) 
    : [];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Aujourd'hui
          </Button>
        </div>

        <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les techniciens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les techniciens</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[100px] border-t border-l bg-muted/30" />
          ))}

          {/* Actual days */}
          {daysInMonth.map((day) => {
            const dayInterventions = getInterventionsForDate(day);
            const hasInterventions = dayInterventions.length > 0;
            const urgentCount = dayInterventions.filter((i) => i.priority === 'urgent').length;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[100px] border-t border-l p-1 cursor-pointer transition-colors hover:bg-muted/50',
                  isToday(day) && 'bg-primary/5',
                  selectedDate && isSameDay(day, selectedDate) && 'bg-primary/10'
                )}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full',
                      isToday(day) && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {urgentCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5 px-1">
                      {urgentCount} urgent
                    </Badge>
                  )}
                </div>

                {hasInterventions && (
                  <div className="space-y-1">
                    {dayInterventions.slice(0, 3).map((intervention) => (
                      <div
                        key={intervention.id}
                        className={cn(
                          'text-xs p-1 rounded truncate',
                          intervention.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : intervention.priority === 'urgent'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInterventionClick?.(intervention);
                        }}
                      >
                        {CATEGORY_ICONS[intervention.category]} {intervention.title}
                      </div>
                    ))}
                    {dayInterventions.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayInterventions.length - 3} autres
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDateInterventions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune intervention prévue</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {selectedDateInterventions.map((intervention) => (
                  <Card
                    key={intervention.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedDate(null);
                      onInterventionClick?.(intervention);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CATEGORY_ICONS[intervention.category]}</span>
                          <div>
                            <h4 className="font-medium">{intervention.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {CATEGORY_LABELS[intervention.category]}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={intervention.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {STATUS_LABELS[intervention.status]}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{intervention.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-3 w-3" />
                          <span>{getTechnicianName(intervention.technicianId)}</span>
                        </div>
                        {intervention.scheduledAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(intervention.scheduledAt), 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
