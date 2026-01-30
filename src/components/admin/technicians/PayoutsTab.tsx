import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Calendar, Euro, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Payout {
  id: string;
  technician_id: string;
  amount: number;
  payout_date: string;
  period_start: string;
  period_end: string;
  status: string;
  notes: string | null;
  technician?: Technician;
}

export function PayoutsTab() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get active technicians
      const { data: techData, error: techError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'technician')
        .eq('is_active', true)
        .order('last_name');

      if (techError) throw techError;
      setTechnicians(techData || []);

      // Get recent payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('technician_payouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (payoutsError) throw payoutsError;

      // Enrich with technician info
      const enrichedPayouts: Payout[] = [];
      for (const payout of payoutsData || []) {
        const tech = techData?.find((t) => t.id === payout.technician_id);
        enrichedPayouts.push({
          ...payout,
          technician: tech,
        });
      }

      setPayouts(enrichedPayouts);
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

  const handleCreatePayout = async () => {
    if (selectedTechnicianIds.length === 0 || !amount || !payoutDate || !periodStart || !periodEnd) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setProcessing(true);
    try {
      const payoutsToCreate = selectedTechnicianIds.map((techId) => ({
        technician_id: techId,
        amount: parseFloat(amount),
        payout_date: payoutDate,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'pending',
        notes: notes || null,
      }));

      const { error } = await supabase.from('technician_payouts').insert(payoutsToCreate);

      if (error) throw error;

      toast.success(
        selectedTechnicianIds.length === 1
          ? 'Versement créé avec succès'
          : `${selectedTechnicianIds.length} versements créés avec succès`
      );

      resetForm();
      setShowDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error creating payout:', error);
      toast.error('Erreur lors de la création du versement');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (payoutId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('technician_payouts')
        .update({ status: newStatus })
        .eq('id', payoutId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      fetchData();
    } catch (error) {
      console.error('Error updating payout status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const resetForm = () => {
    setSelectedTechnicianIds([]);
    setAmount('');
    setPayoutDate('');
    setPeriodStart('');
    setPeriodEnd('');
    setNotes('');
    setIsBatchMode(false);
  };

  const toggleTechnicianSelection = (techId: string) => {
    setSelectedTechnicianIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const selectAllTechnicians = () => {
    if (selectedTechnicianIds.length === technicians.length) {
      setSelectedTechnicianIds([]);
    } else {
      setSelectedTechnicianIds(technicians.map((t) => t.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600">Payé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Versements techniciens</CardTitle>
              <CardDescription>
                Gérez les paiements et versements aux techniciens
              </CardDescription>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau versement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun versement enregistré
            </p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {payout.technician?.first_name} {payout.technician?.last_name}
                      </span>
                      {getStatusBadge(payout.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {Number(payout.amount).toFixed(2)} €
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Versement le {format(new Date(payout.payout_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Période : {format(new Date(payout.period_start), 'dd/MM')} -{' '}
                      {format(new Date(payout.period_end), 'dd/MM/yyyy')}
                    </p>
                    {payout.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {payout.notes}
                      </p>
                    )}
                  </div>
                  {payout.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleUpdateStatus(payout.id, 'paid')}
                      >
                        Marquer payé
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleUpdateStatus(payout.id, 'cancelled')}
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payout Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un versement</DialogTitle>
            <DialogDescription>
              Assignez une date et un montant de versement à un ou plusieurs techniciens
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="batch-mode"
                checked={isBatchMode}
                onCheckedChange={(checked) => {
                  setIsBatchMode(!!checked);
                  if (!checked) setSelectedTechnicianIds([]);
                }}
              />
              <label htmlFor="batch-mode" className="text-sm font-medium cursor-pointer">
                Mode lot (plusieurs techniciens)
              </label>
            </div>

            {isBatchMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Techniciens</label>
                  <Button variant="link" size="sm" onClick={selectAllTechnicians}>
                    {selectedTechnicianIds.length === technicians.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                  </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {technicians.map((tech) => (
                    <div key={tech.id} className="flex items-center gap-2">
                      <Checkbox
                        id={tech.id}
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onCheckedChange={() => toggleTechnicianSelection(tech.id)}
                      />
                      <label htmlFor={tech.id} className="text-sm cursor-pointer">
                        {tech.first_name} {tech.last_name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTechnicianIds.length} technicien(s) sélectionné(s)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Technicien</label>
                <Select
                  value={selectedTechnicianIds[0] || ''}
                  onValueChange={(val) => setSelectedTechnicianIds([val])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un technicien" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.first_name} {tech.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date de versement</label>
                <Input
                  type="date"
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Début période</label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fin période</label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter une note..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleCreatePayout} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le versement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
