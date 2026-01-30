import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Calendar, Euro, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PAGE_SIZE = 15;

export function PayoutsTab() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form state
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      // Build query with search
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email', { count: 'exact' })
        .eq('role', 'technician')
        .eq('is_active', true);

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: techData, count, error: techError } = await query
        .order('last_name')
        .range(from, to);

      if (techError) throw techError;
      setTechnicians(techData || []);
      setTotalCount(count || 0);

      // Get recent payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('technician_payouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (payoutsError) throw payoutsError;

      // Get all technicians for payout display
      const { data: allTechData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'technician');

      // Enrich with technician info
      const enrichedPayouts: Payout[] = [];
      for (const payout of payoutsData || []) {
        const tech = allTechData?.find((t) => t.id === payout.technician_id);
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
    fetchTechnicians();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTechnicianIds([]);
  }, [searchQuery]);

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
      fetchTechnicians();
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
      fetchTechnicians();
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
  };

  const toggleTechnicianSelection = (techId: string) => {
    setSelectedTechnicianIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const selectAllOnPage = () => {
    const pageIds = technicians.map((t) => t.id);
    const allSelected = pageIds.every((id) => selectedTechnicianIds.includes(id));
    
    if (allSelected) {
      // Deselect all on current page
      setSelectedTechnicianIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedTechnicianIds((prev) => [...new Set([...prev, ...pageIds])]);
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const allOnPageSelected = technicians.length > 0 && technicians.every((t) => selectedTechnicianIds.includes(t.id));

  if (loading && technicians.length === 0) {
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
      <div className="space-y-6">
        {/* Technicians Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Sélection des techniciens</CardTitle>
                <CardDescription>
                  Sélectionnez les techniciens pour créer un versement groupé
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, prénom ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button 
                  onClick={() => setShowDialog(true)}
                  disabled={selectedTechnicianIds.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer versement ({selectedTechnicianIds.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : technicians.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {searchQuery ? 'Aucun technicien trouvé' : 'Aucun technicien actif'}
              </p>
            ) : (
              <>
                {/* Select All Header */}
                <div className="flex items-center gap-2 pb-3 border-b mb-3">
                  <Checkbox
                    id="select-all"
                    checked={allOnPageSelected}
                    onCheckedChange={selectAllOnPage}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Sélectionner tous sur cette page
                  </label>
                  {selectedTechnicianIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedTechnicianIds.length} sélectionné(s)
                    </Badge>
                  )}
                </div>

                {/* Technicians List */}
                <div className="space-y-2">
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      className={`border rounded-lg p-3 flex items-center gap-3 transition-colors cursor-pointer ${
                        selectedTechnicianIds.includes(tech.id) 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => toggleTechnicianSelection(tech.id)}
                    >
                      <Checkbox
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onCheckedChange={() => toggleTechnicianSelection(tech.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {tech.first_name} {tech.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{tech.email}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages} ({totalCount} techniciens)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Payouts Card */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des versements</CardTitle>
            <CardDescription>
              Les 50 derniers versements enregistrés
            </CardDescription>
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
      </div>

      {/* Create Payout Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un versement</DialogTitle>
            <DialogDescription>
              Versement pour {selectedTechnicianIds.length} technicien(s) sélectionné(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Techniciens sélectionnés :</p>
              <div className="flex flex-wrap gap-1">
                {selectedTechnicianIds.slice(0, 5).map((id) => {
                  const tech = technicians.find((t) => t.id === id);
                  return tech ? (
                    <Badge key={id} variant="secondary">
                      {tech.first_name} {tech.last_name}
                    </Badge>
                  ) : null;
                })}
                {selectedTechnicianIds.length > 5 && (
                  <Badge variant="outline">
                    +{selectedTechnicianIds.length - 5} autres
                  </Badge>
                )}
              </div>
            </div>

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
              Créer {selectedTechnicianIds.length > 1 ? `${selectedTechnicianIds.length} versements` : 'le versement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
