import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin, Clock, UserCheck, Star, Navigation, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getEligibleTechnicians, type EligibleTechnician } from '@/services/dispatch/eligible-technicians.service';

interface UnassignedIntervention {
  id: string;
  title: string;
  category: string;
  priority: string;
  address: string;
  city: string;
  postal_code: string;
  created_at: string;
  client_email: string | null;
  latitude: number | null;
  longitude: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  normal: 'Normal',
};

export function DispatchTab() {
  const [interventions, setInterventions] = useState<UnassignedIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState<UnassignedIntervention | null>(null);
  const [eligibleTechnicians, setEligibleTechnicians] = useState<EligibleTechnician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get unassigned interventions (status = 'new' or 'pending' without technician)
      const { data: interventionsData, error: intError } = await supabase
        .from('interventions')
        .select('id, title, category, priority, address, city, postal_code, created_at, client_email, latitude, longitude')
        .in('status', ['new', 'pending'])
        .is('technician_id', null)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (intError) throw intError;
      setInterventions(interventionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Load eligible technicians when intervention is selected
  useEffect(() => {
    if (!selectedIntervention) {
      setEligibleTechnicians([]);
      setSelectedTechnicianId('');
      return;
    }

    const loadEligibleTechnicians = async () => {
      if (!selectedIntervention.latitude || !selectedIntervention.longitude) {
        setEligibleTechnicians([]);
        return;
      }

      setLoadingTechnicians(true);
      try {
        const technicians = await getEligibleTechnicians({
          interventionId: selectedIntervention.id,
          interventionLatitude: selectedIntervention.latitude,
          interventionLongitude: selectedIntervention.longitude,
          requiredSkill: selectedIntervention.category,
          limit: 10,
        });
        setEligibleTechnicians(technicians);
      } catch (error) {
        console.error('Error fetching eligible technicians:', error);
        toast.error('Erreur lors du chargement des techniciens');
      } finally {
        setLoadingTechnicians(false);
      }
    };

    loadEligibleTechnicians();
  }, [selectedIntervention]);

  const handleAssign = async () => {
    if (!selectedIntervention || !selectedTechnicianId) return;

    setProcessing(true);
    try {
      // Update intervention with technician
      const { error: updateError } = await supabase
        .from('interventions')
        .update({
          technician_id: selectedTechnicianId,
          status: 'assigned',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', selectedIntervention.id);

      if (updateError) throw updateError;

      // Notify technician via edge function
      await supabase.functions.invoke('notify-manual-dispatch', {
        body: {
          interventionId: selectedIntervention.id,
          technicianId: selectedTechnicianId,
          interventionDetails: {
            title: selectedIntervention.title,
            address: selectedIntervention.address,
            city: selectedIntervention.city,
            postalCode: selectedIntervention.postal_code,
            category: selectedIntervention.category,
          },
        },
      });

      toast.success('Intervention assignée et notification envoyée');
      setSelectedIntervention(null);
      setSelectedTechnicianId('');
      fetchData();
    } catch (error) {
      console.error('Error assigning intervention:', error);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dispatch manuel</CardTitle>
          <CardDescription>
            {interventions.length} intervention(s) non assignée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Toutes les interventions sont assignées
            </p>
          ) : (
            <div className="space-y-4">
              {interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{intervention.title}</span>
                      <Badge
                        variant={intervention.priority === 'urgent' ? 'destructive' : 'secondary'}
                      >
                        {PRIORITY_LABELS[intervention.priority]}
                      </Badge>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[intervention.category]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {intervention.address}, {intervention.postal_code} {intervention.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(intervention.created_at), 'dd MMM HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {(!intervention.latitude || !intervention.longitude) && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Coordonnées GPS manquantes
                      </p>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSelectedIntervention(intervention)}
                    disabled={!intervention.latitude || !intervention.longitude}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Assigner
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog with Technician List */}
      <Dialog open={!!selectedIntervention} onOpenChange={() => setSelectedIntervention(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assigner l'intervention</DialogTitle>
            <DialogDescription>
              Sélectionnez un technicien parmi les 10 plus proches, qualifiés et disponibles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Intervention details */}
            {selectedIntervention && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">{selectedIntervention.title}</p>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {selectedIntervention.address}, {selectedIntervention.postal_code} {selectedIntervention.city}
                </p>
                <Badge variant="outline" className="mt-2">
                  {CATEGORY_LABELS[selectedIntervention.category]}
                </Badge>
              </div>
            )}

            {/* Technicians list */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Techniciens éligibles</label>
              
              {loadingTechnicians ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : eligibleTechnicians.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun technicien éligible trouvé</p>
                  <p className="text-xs mt-1">
                    (qualifié, n'ayant pas refusé/annulé)
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {eligibleTechnicians.map((tech) => (
                      <div
                        key={tech.id}
                        onClick={() => setSelectedTechnicianId(tech.id)}
                        className={`
                          border rounded-lg p-3 cursor-pointer transition-colors
                          ${selectedTechnicianId === tech.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={tech.avatarUrl || undefined} />
                            <AvatarFallback>
                              {tech.firstName[0]}{tech.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {tech.firstName} {tech.lastName}
                              </span>
                              {tech.averageRating && (
                                <span className="flex items-center gap-0.5 text-sm text-amber-600">
                                  <Star className="h-3 w-3 fill-current" />
                                  {tech.averageRating.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                {tech.distanceKm} km
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                ~{tech.estimatedArrivalMinutes} min
                              </span>
                              {tech.currentCity && (
                                <span className="truncate">
                                  {tech.currentCity}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedTechnicianId === tech.id && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <UserCheck className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedIntervention(null)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleAssign} disabled={!selectedTechnicianId || processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer l'assignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
