import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Save, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { scheduleService, type TechnicianSchedule, type ScheduleOverride } from '@/services/schedule/schedule.service';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, addDays, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

const TechnicianSchedulePage = () => {
  const { user } = useAuth();
  
  const [schedule, setSchedule] = useState<TechnicianSchedule[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentDay, setCurrentDay] = useState(new Date());
  
  // Override dialog state
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<Date | null>(null);
  const [overrideIsAvailable, setOverrideIsAvailable] = useState(false);
  const [overrideStartTime, setOverrideStartTime] = useState('08:00');
  const [overrideEndTime, setOverrideEndTime] = useState('18:00');
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        let scheduleData = await scheduleService.getSchedule(user.id);
        
        if (scheduleData.length === 0) {
          await scheduleService.initializeDefaultSchedule(user.id);
          scheduleData = await scheduleService.getSchedule(user.id);
        }
        
        setSchedule(scheduleData);
        
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const overridesData = await scheduleService.getOverrides(user.id, start, end);
        setOverrides(overridesData);
        
      } catch (err) {
        console.error('Error fetching schedule:', err);
        toast.error('Erreur lors du chargement du planning');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, currentMonth]);

  const handleDayScheduleChange = async (dayOfWeek: number, field: string, value: string | boolean) => {
    if (!user) return;
    
    const updatedSchedule = schedule.map(s => {
      if (s.dayOfWeek === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    });
    
    setSchedule(updatedSchedule);
  };

  const saveSchedule = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      for (const day of schedule) {
        await scheduleService.updateDaySchedule(
          user.id,
          day.dayOfWeek,
          day.isWorkingDay,
          day.startTime,
          day.endTime
        );
      }
      
      toast.success('Planning enregistré');
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const openOverrideDialog = (date: Date) => {
    const existingOverride = overrides.find(o => 
      isSameDay(new Date(o.overrideDate), date)
    );
    
    setOverrideDate(date);
    
    if (existingOverride) {
      setOverrideIsAvailable(existingOverride.isAvailable);
      setOverrideStartTime(existingOverride.startTime?.slice(0, 5) || '08:00');
      setOverrideEndTime(existingOverride.endTime?.slice(0, 5) || '18:00');
      setOverrideReason(existingOverride.reason || '');
    } else {
      const daySchedule = schedule.find(s => s.dayOfWeek === date.getDay());
      setOverrideIsAvailable(!daySchedule?.isWorkingDay);
      setOverrideStartTime(daySchedule?.startTime?.slice(0, 5) || '08:00');
      setOverrideEndTime(daySchedule?.endTime?.slice(0, 5) || '18:00');
      setOverrideReason('');
    }
    
    setOverrideDialogOpen(true);
  };

  const saveOverride = async () => {
    if (!user || !overrideDate) return;
    
    try {
      await scheduleService.setOverride(
        user.id,
        overrideDate,
        overrideIsAvailable,
        overrideIsAvailable ? overrideStartTime : undefined,
        overrideIsAvailable ? overrideEndTime : undefined,
        overrideReason || undefined
      );
      
      const start = startOfMonth(subMonths(currentMonth, 1));
      const end = endOfMonth(addMonths(currentMonth, 1));
      const overridesData = await scheduleService.getOverrides(user.id, start, end);
      setOverrides(overridesData);
      
      toast.success('Exception enregistrée');
      setOverrideDialogOpen(false);
    } catch (err) {
      console.error('Error saving override:', err);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const deleteOverride = async (overrideId: string) => {
    try {
      await scheduleService.deleteOverride(overrideId);
      setOverrides(overrides.filter(o => o.id !== overrideId));
      toast.success('Exception supprimée');
      setOverrideDialogOpen(false);
    } catch (err) {
      console.error('Error deleting override:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getDayStatus = (date: Date): 'working' | 'off' | 'override-working' | 'override-off' => {
    const override = overrides.find(o => isSameDay(new Date(o.overrideDate), date));
    if (override) {
      return override.isAvailable ? 'override-working' : 'override-off';
    }
    
    const daySchedule = schedule.find(s => s.dayOfWeek === date.getDay());
    return daySchedule?.isWorkingDay ? 'working' : 'off';
  };

  const getHoursForDay = (date: Date): { start: string; end: string } | null => {
    const override = overrides.find(o => isSameDay(new Date(o.overrideDate), date));
    if (override) {
      if (!override.isAvailable) return null;
      return { start: override.startTime?.slice(0, 5) || '08:00', end: override.endTime?.slice(0, 5) || '18:00' };
    }
    
    const daySchedule = schedule.find(s => s.dayOfWeek === date.getDay());
    if (!daySchedule?.isWorkingDay) return null;
    return { start: daySchedule.startTime.slice(0, 5), end: daySchedule.endTime.slice(0, 5) };
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: addDays(currentWeekStart, 6),
  });

  if (!user) return null;

  return (
    <TechnicianLayout title="Planning" subtitle="Gérez vos disponibilités">
      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : (
        <>
          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList>
              <TabsTrigger value="calendar">Calendrier</TabsTrigger>
              <TabsTrigger value="weekly">Horaires hebdomadaires</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('day')}
                  >
                    Jour
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('week')}
                  >
                    Semaine
                  </Button>
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                  >
                    Mois
                  </Button>
                </div>
                
                <Button variant="outline" size="sm" onClick={() => {
                  setCurrentMonth(new Date());
                  setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                  setCurrentDay(new Date());
                }}>
                  Aujourd'hui
                </Button>
              </div>

              {/* Month View */}
              {viewMode === 'month' && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <CardTitle className="text-lg capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                      
                      {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      
                      {monthDays.map(date => {
                        const status = getDayStatus(date);
                        const hours = getHoursForDay(date);
                        
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => openOverrideDialog(date)}
                            className={`
                              aspect-square p-1 rounded-lg text-center transition-colors
                              ${isToday(date) ? 'ring-2 ring-primary' : ''}
                              ${status === 'working' ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50' : ''}
                              ${status === 'off' ? 'bg-muted hover:bg-muted/80' : ''}
                              ${status === 'override-working' ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50' : ''}
                              ${status === 'override-off' ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50' : ''}
                            `}
                          >
                            <div className="text-sm font-medium">{format(date, 'd')}</div>
                            {hours && (
                              <div className="text-[10px] text-muted-foreground">
                                {hours.start}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="flex gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                        <span>Travail</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-muted" />
                        <span>Repos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30" />
                        <span>Exception (dispo)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                        <span>Exception (absent)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <CardTitle className="text-lg">
                        Semaine du {format(currentWeekStart, 'd MMMM', { locale: fr })}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map(date => {
                        const status = getDayStatus(date);
                        const hours = getHoursForDay(date);
                        
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => openOverrideDialog(date)}
                            className={`
                              p-3 rounded-lg text-center transition-colors
                              ${isToday(date) ? 'ring-2 ring-primary' : ''}
                              ${status === 'working' ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30' : ''}
                              ${status === 'off' ? 'bg-muted hover:bg-muted/80' : ''}
                              ${status === 'override-working' ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30' : ''}
                              ${status === 'override-off' ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30' : ''}
                            `}
                          >
                            <div className="text-xs text-muted-foreground capitalize">
                              {format(date, 'EEE', { locale: fr })}
                            </div>
                            <div className="text-lg font-medium">{format(date, 'd')}</div>
                            {hours ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                {hours.start} - {hours.end}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground mt-1">Repos</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Day View */}
              {viewMode === 'day' && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="icon" onClick={() => setCurrentDay(addDays(currentDay, -1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <CardTitle className="text-lg capitalize">
                        {format(currentDay, 'EEEE d MMMM yyyy', { locale: fr })}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setCurrentDay(addDays(currentDay, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const status = getDayStatus(currentDay);
                      const hours = getHoursForDay(currentDay);
                      const override = overrides.find(o => isSameDay(new Date(o.overrideDate), currentDay));
                      
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Badge variant={hours ? 'default' : 'secondary'} className="text-sm">
                              {hours ? 'Disponible' : 'Non disponible'}
                            </Badge>
                            {status.startsWith('override') && (
                              <Badge variant="outline">Exception</Badge>
                            )}
                          </div>
                          
                          {hours && (
                            <div className="flex items-center gap-2 text-lg">
                              <Clock className="h-5 w-5 text-muted-foreground" />
                              <span>{hours.start} - {hours.end}</span>
                            </div>
                          )}
                          
                          {override?.reason && (
                            <div className="text-muted-foreground">
                              Raison : {override.reason}
                            </div>
                          )}
                          
                          <Button onClick={() => openOverrideDialog(currentDay)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {override ? 'Modifier l\'exception' : 'Ajouter une exception'}
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Horaires par défaut
                  </CardTitle>
                  <CardDescription>
                    Définissez vos jours et heures de travail habituels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {schedule.sort((a, b) => {
                    const order = [1, 2, 3, 4, 5, 6, 0];
                    return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
                  }).map(day => (
                    <div key={day.dayOfWeek} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="w-24 font-medium">
                        {scheduleService.getDayName(day.dayOfWeek)}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={day.isWorkingDay}
                          onCheckedChange={(checked) => handleDayScheduleChange(day.dayOfWeek, 'isWorkingDay', checked)}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {day.isWorkingDay ? 'Travail' : 'Repos'}
                        </Label>
                      </div>
                      
                      {day.isWorkingDay && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Input
                            type="time"
                            value={day.startTime.slice(0, 5)}
                            onChange={(e) => handleDayScheduleChange(day.dayOfWeek, 'startTime', e.target.value + ':00')}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">à</span>
                          <Input
                            type="time"
                            value={day.endTime.slice(0, 5)}
                            onChange={(e) => handleDayScheduleChange(day.dayOfWeek, 'endTime', e.target.value + ':00')}
                            className="w-28"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button onClick={saveSchedule} disabled={saving} className="mt-4">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Override Dialog */}
          <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
            <DialogContent className="bg-background">
              <DialogHeader>
                <DialogTitle>
                  {overrideDate && format(overrideDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={overrideIsAvailable}
                    onCheckedChange={setOverrideIsAvailable}
                  />
                  <Label>{overrideIsAvailable ? 'Disponible' : 'Non disponible'}</Label>
                </div>
                
                {overrideIsAvailable && (
                  <div className="flex items-center gap-2">
                    <Label>Horaires :</Label>
                    <Input
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="w-28"
                    />
                    <span>à</span>
                    <Input
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Raison (optionnel)</Label>
                  <Textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Ex: Congés, rendez-vous médical..."
                  />
                </div>
              </div>
              
              <DialogFooter className="flex justify-between">
                {overrides.find(o => overrideDate && isSameDay(new Date(o.overrideDate), overrideDate)) && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const override = overrides.find(o => overrideDate && isSameDay(new Date(o.overrideDate), overrideDate));
                      if (override) deleteOverride(override.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <DialogClose asChild>
                    <Button variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button onClick={saveOverride}>Enregistrer</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </TechnicianLayout>
  );
};

export default TechnicianSchedulePage;
