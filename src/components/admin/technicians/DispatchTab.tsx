import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin, Clock, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
}

interface AvailableTechnician {
  id: string;
  first_name: string;
  last_name: string;
  skills: string[];
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
  const [technicians, setTechnicians] = useState<AvailableTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState<UnassignedIntervention | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get unassigned interventions (status = 'new' or 'pending' without technician)
      const { data: interventionsData, error: intError } = await supabase
        .from('interventions')
        .select('id, title, category, priority, address, city, postal_code, created_at, client_email')
        .in('status', ['new', 'pending'])
        .is('technician_id', null)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (intError) throw intError;
      setInterventions(interventionsData || []);

      // Get active technicians with their skills
      const { data: techData, error: techError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'technician')
        .eq('is_active', true);

      if (techError) throw techError;

      // Enrich with skills
      const enrichedTechs: AvailableTechnician[] = [];
      for (const tech of techData || []) {
        const { data: appData } = await supabase
          .from('partner_applications')
          .select('skills')
          .eq('user_id', tech.id)
          .single();

        enrichedTechs.push({
          ...tech,
          skills: appData?.skills || [],
        });
      }

      setTechnicians(enrichedTechs);
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

  // Filter technicians by matching skills
  const getMatchingTechnicians = (category: string) => {
    return technicians.filter((tech) => tech.skills.includes(category));
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
              {interventions.map((intervention) => {
                const matchingTechs = getMatchingTechnicians(intervention.category);
                return (
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {matchingTechs.length} technicien(s) qualifié(s) disponible(s)
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setSelectedIntervention(intervention)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Assigner
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={!!selectedIntervention} onOpenChange={() => setSelectedIntervention(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner l'intervention</DialogTitle>
            <DialogDescription>
              Sélectionnez un technicien pour l'intervention : {selectedIntervention?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Technicien</label>
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un technicien" />
                </SelectTrigger>
                <SelectContent>
                  {selectedIntervention &&
                    getMatchingTechnicians(selectedIntervention.category).map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.first_name} {tech.last_name}
                      </SelectItem>
                    ))}
                  {selectedIntervention &&
                    getMatchingTechnicians(selectedIntervention.category).length === 0 && (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        Aucun technicien qualifié
                      </div>
                    )}
                </SelectContent>
              </Select>
            </div>

            {selectedIntervention && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Détails de l'intervention :</p>
                <p>{selectedIntervention.address}</p>
                <p>{selectedIntervention.postal_code} {selectedIntervention.city}</p>
                <p className="text-muted-foreground mt-1">
                  Catégorie : {CATEGORY_LABELS[selectedIntervention.category]}
                </p>
              </div>
            )}
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
