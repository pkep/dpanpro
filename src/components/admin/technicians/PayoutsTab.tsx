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
import { Loader2, Calendar, Euro, Plus, Search, ChevronLeft, ChevronRight, AlertTriangle, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TechnicianWithRevenue extends Technician {
  previousMonthRevenue: number;
  hasPendingPayout: boolean;
  existingPayoutId?: string;
  existingPayoutStatus?: string;
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
  const [technicians, setTechnicians] = useState<TechnicianWithRevenue[]>([]);
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
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({});
  const [payoutDate, setPayoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // Previous month period
  const now = new Date();
  const previousMonth = subMonths(now, 1);
  const periodStart = startOfMonth(previousMonth);
  const periodEnd = endOfMonth(previousMonth);
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd');

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
      setTotalCount(count || 0);

      // Get previous month payouts for these technicians
      const techIds = techData?.map(t => t.id) || [];
      
      const { data: existingPayouts } = await supabase
        .from('technician_payouts')
        .select('*')
        .in('technician_id', techIds)
        .eq('period_start', periodStartStr)
        .eq('period_end', periodEndStr);

      // Get completed interventions for previous month for each technician
      const { data: interventions } = await supabase
        .from('interventions')
        .select('technician_id, final_price, completed_at')
        .in('technician_id', techIds)
        .eq('status', 'completed')
        .not('final_price', 'is', null)
        .gte('completed_at', startOfDay(periodStart).toISOString())
        .lte('completed_at', endOfDay(periodEnd).toISOString());

      // Get commission rate
      const { data: commissionData } = await supabase
        .from('commission_settings')
        .select('commission_rate')
        .is('partner_id', null)
        .single();

      const commissionRate = commissionData?.commission_rate ? Number(commissionData.commission_rate) : 15;

      // Calculate revenue per technician
      const revenueByTech: Record<string, number> = {};
      interventions?.forEach(i => {
        if (i.technician_id) {
          const gross = Number(i.final_price) || 0;
          const net = gross * (1 - commissionRate / 100);
          revenueByTech[i.technician_id] = (revenueByTech[i.technician_id] || 0) + net;
        }
      });

      // Enrich technicians with revenue and payout status
      const enrichedTechnicians: TechnicianWithRevenue[] = (techData || []).map(tech => {
        const existingPayout = existingPayouts?.find(p => p.technician_id === tech.id);
        return {
          ...tech,
          previousMonthRevenue: revenueByTech[tech.id] || 0,
          hasPendingPayout: !!existingPayout,
          existingPayoutId: existingPayout?.id,
          existingPayoutStatus: existingPayout?.status,
        };
      });

      setTechnicians(enrichedTechnicians);

      // Initialize payout amounts with calculated revenue
      const initialAmounts: Record<string, string> = {};
      enrichedTechnicians.forEach(tech => {
        if (!tech.hasPendingPayout && tech.previousMonthRevenue > 0) {
          initialAmounts[tech.id] = tech.previousMonthRevenue.toFixed(2);
        }
      });
      setPayoutAmounts(prev => ({ ...prev, ...initialAmounts }));

      // Get recent payouts for history
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
    // Validate all selected technicians have amounts
    const missingAmounts = selectedTechnicianIds.filter(id => {
      const amount = payoutAmounts[id];
      return !amount || parseFloat(amount) <= 0;
    });

    if (missingAmounts.length > 0) {
      toast.error('Veuillez renseigner un montant valide pour tous les techniciens sélectionnés');
      return;
    }

    if (selectedTechnicianIds.length === 0 || !payoutDate) {
      toast.error('Veuillez sélectionner au moins un technicien et une date de versement');
      return;
    }

    setProcessing(true);
    try {
      const payoutsToCreate = selectedTechnicianIds.map((techId) => ({
        technician_id: techId,
        amount: parseFloat(payoutAmounts[techId] || '0'),
        payout_date: payoutDate,
        period_start: periodStartStr,
        period_end: periodEndStr,
        status: 'paid',
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
    setPayoutAmounts({});
    setPayoutDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const toggleTechnicianSelection = (techId: string) => {
    const tech = technicians.find(t => t.id === techId);
    if (tech?.hasPendingPayout) return; // Can't select if already has payout

    setSelectedTechnicianIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const selectAllEligible = () => {
    const eligibleIds = technicians
      .filter(t => !t.hasPendingPayout && t.previousMonthRevenue > 0)
      .map((t) => t.id);
    
    const allSelected = eligibleIds.every((id) => selectedTechnicianIds.includes(id));
    
    if (allSelected) {
      setSelectedTechnicianIds((prev) => prev.filter((id) => !eligibleIds.includes(id)));
    } else {
      setSelectedTechnicianIds((prev) => [...new Set([...prev, ...eligibleIds])]);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const eligibleTechnicians = technicians.filter(t => !t.hasPendingPayout && t.previousMonthRevenue > 0);
  const allEligibleSelected = eligibleTechnicians.length > 0 && eligibleTechnicians.every((t) => selectedTechnicianIds.includes(t.id));
  const techniciansWithPendingPayouts = technicians.filter(t => !t.hasPendingPayout && t.previousMonthRevenue > 0);

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
        {/* Period Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Période de versement : {format(periodStart, 'MMMM yyyy', { locale: fr })}</p>
                  <p className="text-sm text-muted-foreground">
                    Du {format(periodStart, 'dd MMMM', { locale: fr })} au {format(periodEnd, 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
              {techniciansWithPendingPayouts.length > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {techniciansWithPendingPayouts.length} versement(s) en attente
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technicians Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Versements du mois précédent</CardTitle>
                <CardDescription>
                  Renseignez les versements pour la période de {format(periodStart, 'MMMM yyyy', { locale: fr })}
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
                  Valider ({selectedTechnicianIds.length})
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
                {eligibleTechnicians.length > 0 && (
                  <div className="flex items-center gap-2 pb-3 border-b mb-3">
                    <Checkbox
                      id="select-all"
                      checked={allEligibleSelected}
                      onCheckedChange={selectAllEligible}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Sélectionner tous les techniciens éligibles
                    </label>
                    {selectedTechnicianIds.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedTechnicianIds.length} sélectionné(s)
                      </Badge>
                    )}
                  </div>
                )}

                {/* Technicians List */}
                <div className="space-y-2">
                  {technicians.map((tech) => {
                    const isSelected = selectedTechnicianIds.includes(tech.id);
                    const isDisabled = tech.hasPendingPayout;
                    
                    return (
                      <div
                        key={tech.id}
                        className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${
                          isDisabled 
                            ? 'bg-muted/30 opacity-60 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-primary/5 border-primary/30 cursor-pointer' 
                              : 'hover:bg-accent/50 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && toggleTechnicianSelection(tech.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={() => !isDisabled && toggleTechnicianSelection(tech.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {tech.first_name} {tech.last_name}
                            </p>
                            {tech.hasPendingPayout && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                <Check className="h-3 w-3 mr-1" />
                                {tech.existingPayoutStatus === 'paid' ? 'Versé' : 'Enregistré'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{tech.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {formatCurrency(tech.previousMonthRevenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">Net à verser</p>
                        </div>
                        {isSelected && !isDisabled && (
                          <div className="w-32" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              step="0.01"
                              value={payoutAmounts[tech.id] || ''}
                              onChange={(e) => setPayoutAmounts(prev => ({ ...prev, [tech.id]: e.target.value }))}
                              placeholder="Montant"
                              className="text-right"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmer les versements</DialogTitle>
            <DialogDescription>
              Période : {format(periodStart, 'dd MMMM', { locale: fr })} - {format(periodEnd, 'dd MMMM yyyy', { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary of selected technicians */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Techniciens sélectionnés ({selectedTechnicianIds.length}) :</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedTechnicianIds.map((id) => {
                  const tech = technicians.find((t) => t.id === id);
                  const amount = payoutAmounts[id] || '0';
                  return tech ? (
                    <div key={id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <span className="text-sm">
                        {tech.first_name} {tech.last_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          (Généré: {formatCurrency(tech.previousMonthRevenue)})
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setPayoutAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                          className="w-28 text-right h-8"
                        />
                        <span className="text-sm">€</span>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Total */}
            <div className="p-3 bg-primary/5 rounded-lg flex items-center justify-between">
              <span className="font-medium">Total des versements :</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(
                  selectedTechnicianIds.reduce((sum, id) => sum + (parseFloat(payoutAmounts[id] || '0') || 0), 0)
                )}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date de versement</label>
              <Input
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
              />
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
              Valider {selectedTechnicianIds.length > 1 ? `${selectedTechnicianIds.length} versements` : 'le versement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
