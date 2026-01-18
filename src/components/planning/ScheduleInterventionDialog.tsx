import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { usersService } from '@/services/users/users.service';
import { historyService } from '@/services/history/history.service';
import type { Intervention, InterventionStatus } from '@/types/intervention.types';
import type { User } from '@/types/auth.types';
import { CATEGORY_ICONS, STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS } from '@/types/intervention.types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, MapPin, Clock, User as UserIcon, CheckCircle } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ScheduleInterventionDialogProps {
  intervention: Intervention | null;
  technicians: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: () => void;
}

export function ScheduleInterventionDialog({
  intervention,
  technicians,
  open,
  onOpenChange,
  onScheduled,
}: ScheduleInterventionDialogProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (intervention) {
      if (intervention.scheduledAt) {
        const scheduled = new Date(intervention.scheduledAt);
        setSelectedDate(scheduled);
        setSelectedTime(format(scheduled, 'HH:mm'));
      } else {
        setSelectedDate(undefined);
        setSelectedTime('09:00');
      }
      setSelectedTechnician(intervention.technicianId || '');
    }
  }, [intervention]);

  const handleSubmit = async () => {
    if (!intervention || !selectedDate || !user) return;

    try {
      setSubmitting(true);

      // Combine date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

      // Update intervention with scheduled date
      const { error } = await (await import('@/integrations/supabase/client')).supabase
        .from('interventions')
        .update({
          scheduled_at: scheduledAt.toISOString(),
          technician_id: selectedTechnician || null,
          status: selectedTechnician ? 'assigned' : intervention.status,
        })
        .eq('id', intervention.id);

      if (error) throw error;

      // Add history entry
      await historyService.addHistoryEntry({
        interventionId: intervention.id,
        userId: user.id,
        action: 'updated',
        newValue: format(scheduledAt, 'dd/MM/yyyy HH:mm'),
        comment: `Planifiée pour le ${format(scheduledAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      });

      if (selectedTechnician && selectedTechnician !== intervention.technicianId) {
        await historyService.addHistoryEntry({
          interventionId: intervention.id,
          userId: user.id,
          action: 'assigned',
          newValue: selectedTechnician,
        });
      }

      toast.success('Intervention planifiée');
      onScheduled();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erreur lors de la planification');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minutes = (i % 2) * 30;
    if (hour >= 20) return null;
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }).filter(Boolean) as string[];

  if (!intervention) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Planifier l'intervention
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Intervention Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{CATEGORY_ICONS[intervention.category]}</span>
                <div>
                  <h4 className="font-medium">{intervention.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[intervention.category]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{intervention.address}, {intervention.city}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{PRIORITY_LABELS[intervention.priority]}</Badge>
                <Badge variant="secondary">{STATUS_LABELS[intervention.status]}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={fr}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Heure</label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sélectionner une heure" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Technician Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Technicien</label>
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger>
                <UserIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sélectionner un technicien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Non assigné</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedDate || submitting}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Planifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
