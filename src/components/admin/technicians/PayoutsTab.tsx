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
import { Loader2, Calendar, Euro, Plus, Search, ChevronLeft, ChevronRight, AlertTriangle, History } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TechnicianWithRevenue extends Technician {
  grossRevenue: number;
  commissionAmount: number;
  netRevenue: number;
  commissionRate: number;
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
  // Technicians without payout for current period
  const [pendingTechnicians, setPendingTechnicians] = useState<TechnicianWithRevenue[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // History section
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  // Fetch technicians WITHOUT payout for the previous month
  const fetchPendingTechnicians = async () => {
    setLoadingPending(true);
    try {
      // Get all active technicians
      const { data: allTechs, error: techError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'technician')
        .eq('is_active', true)
        .order('last_name');

      if (techError) throw techError;

      const techIds = allTechs?.map(t => t.id) || [];

      // Get existing payouts for this period
      const { data: existingPayouts } = await supabase
        .from('technician_payouts')
        .select('technician_id')
        .in('technician_id', techIds)
        .eq('period_start', periodStartStr)
        .eq('period_end', periodEndStr);

      const paidTechIds = new Set(existingPayouts?.map(p => p.technician_id) || []);

      // Filter to only technicians without a payout
      const unpaidTechs = allTechs?.filter(t => !paidTechIds.has(t.id)) || [];
      const unpaidTechIds = unpaidTechs.map(t => t.id);

      if (unpaidTechIds.length === 0) {
        setPendingTechnicians([]);
        setLoadingPending(false);
        return;
      }

      // Get completed interventions for previous month for unpaid technicians
      const { data: interventions } = await supabase
        .from('interventions')
        .select('technician_id, final_price, completed_at')
        .in('technician_id', unpaidTechIds)
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
      const revenueByTech: Record<string, { gross: number; commission: number; net: number }> = {};
      interventions?.forEach(i => {
        if (i.technician_id) {
          const gross = Number(i.final_price) || 0;
          const commission = gross * (commissionRate / 100);
          const net = gross - commission;
          
          if (!revenueByTech[i.technician_id]) {
            revenueByTech[i.technician_id] = { gross: 0, commission: 0, net: 0 };
          }
          revenueByTech[i.technician_id].gross += gross;
          revenueByTech[i.technician_id].commission += commission;
          revenueByTech[i.technician_id].net += net;
        }
      });

      // Enrich technicians with revenue
      const enrichedTechnicians: TechnicianWithRevenue[] = unpaidTechs.map(tech => {
        const revenue = revenueByTech[tech.id] || { gross: 0, commission: 0, net: 0 };
        return {
          ...tech,
          grossRevenue: revenue.gross,
          commissionAmount: revenue.commission,
          netRevenue: revenue.net,
          commissionRate,
        };
      });

      setPendingTechnicians(enrichedTechnicians);

      // Initialize payout amounts with calculated net revenue
      const initialAmounts: Record<string, string> = {};
      enrichedTechnicians.forEach(tech => {
        if (tech.netRevenue > 0) {
          initialAmounts[tech.id] = tech.netRevenue.toFixed(2);
        }
      });
      setPayoutAmounts(prev => ({ ...prev, ...initialAmounts }));
    } catch (error) {
      console.error('Error fetching pending technicians:', error);
      toast.error('Erreur lors du chargement des techniciens');
    } finally {
      setLoadingPending(false);
    }
  };

  // Fetch payout history with search
  const fetchPayoutHistory = async () => {
    setLoadingHistory(true);
    try {
      // First get all technicians for name lookup
      const { data: allTechData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'technician');

      // If searching, filter technician IDs first
      let filteredTechIds: string[] | null = null;
      if (historySearchQuery) {
        filteredTechIds = allTechData
          ?.filter(t => 
            t.first_name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            t.last_name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            t.email.toLowerCase().includes(historySearchQuery.toLowerCase())
          )
          .map(t => t.id) || [];
      }

      // Build query for payouts
      let query = supabase
        .from('technician_payouts')
        .select('*', { count: 'exact' });

      if (filteredTechIds !== null) {
        if (filteredTechIds.length === 0) {
          // No matching technicians
          setPayouts([]);
          setHistoryTotalCount(0);
          setLoadingHistory(false);
          return;
        }
        query = query.in('technician_id', filteredTechIds);
      }

      const from = (historyPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: payoutsData, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setHistoryTotalCount(count || 0);

      // Enrich with technician info
      const enrichedPayouts: Payout[] = (payoutsData || []).map(payout => {
        const tech = allTechData?.find(t => t.id === payout.technician_id);
        return {
          ...payout,
          technician: tech,
        };
      });

      setPayouts(enrichedPayouts);
    } catch (error) {
      console.error('Error fetching payout history:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPendingTechnicians();
  }, []);

  useEffect(() => {
    fetchPayoutHistory();
  }, [historyPage, historySearchQuery]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchQuery]);

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
      fetchPendingTechnicians();
      fetchPayoutHistory();
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
      fetchPayoutHistory();
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
    setSelectedTechnicianIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const selectAllEligible = () => {
    const eligibleIds = pendingTechnicians
      .filter(t => t.netRevenue > 0)
      .map(t => t.id);
    
    const allSelected = eligibleIds.every(id => selectedTechnicianIds.includes(id));
    
    if (allSelected) {
      setSelectedTechnicianIds(prev => prev.filter(id => !eligibleIds.includes(id)));
    } else {
      setSelectedTechnicianIds(prev => [...new Set([...prev, ...eligibleIds])]);
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

  const eligibleTechnicians = pendingTechnicians.filter(t => t.netRevenue > 0);
  const allEligibleSelected = eligibleTechnicians.length > 0 && eligibleTechnicians.every(t => selectedTechnicianIds.includes(t.id));
  const historyTotalPages = Math.ceil(historyTotalCount / PAGE_SIZE);

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
              {pendingTechnicians.length > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {pendingTechnicians.length} technicien(s) sans versement
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technicians Without Payout Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Versements en attente</CardTitle>
                <CardDescription>
                  Techniciens sans versement pour la période de {format(periodStart, 'MMMM yyyy', { locale: fr })}
                </CardDescription>
              </div>
              <Button 
                onClick={() => setShowDialog(true)}
                disabled={selectedTechnicianIds.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Valider ({selectedTechnicianIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingTechnicians.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                  Tous les versements ont été enregistrés pour cette période
                </p>
              </div>
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
                      Sélectionner tous les techniciens avec CA
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
                  {pendingTechnicians.map((tech) => {
                    const isSelected = selectedTechnicianIds.includes(tech.id);
                    
                    return (
                      <div
                        key={tech.id}
                        className={`border rounded-lg p-3 flex items-center gap-3 transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => toggleTechnicianSelection(tech.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTechnicianSelection(tech.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {tech.first_name} {tech.last_name}
                            </p>
                            {tech.netRevenue === 0 && (
                              <Badge variant="outline" className="text-xs">Aucun CA</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{tech.email}</p>
                        </div>
                        <div className="text-right min-w-[200px]">
                          {tech.grossRevenue > 0 ? (
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>CA brut :</span>
                                <span>{formatCurrency(tech.grossRevenue)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-destructive/80">
                                <span>Commission ({tech.commissionRate}%) :</span>
                                <span>- {formatCurrency(tech.commissionAmount)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-primary border-t pt-0.5 mt-0.5">
                                <span className="text-xs">Net à verser :</span>
                                <span>{formatCurrency(tech.netRevenue)}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">0,00 €</p>
                          )}
                        </div>
                        {isSelected && (
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Payout History Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Historique des versements</CardTitle>
                  <CardDescription>
                    Recherchez et consultez l'historique des versements
                  </CardDescription>
                </div>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nom, prénom ou email..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payouts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {historySearchQuery ? 'Aucun versement trouvé' : 'Aucun versement enregistré'}
              </p>
            ) : (
              <>
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
                        <p className="text-xs text-muted-foreground mb-1">
                          {payout.technician?.email}
                        </p>
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

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {historyPage} sur {historyTotalPages} ({historyTotalCount} versements)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                        disabled={historyPage === historyTotalPages}
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
                  const tech = pendingTechnicians.find((t) => t.id === id);
                  const amount = payoutAmounts[id] || '0';
                  return tech ? (
                    <div key={id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {tech.first_name} {tech.last_name}
                        </span>
                      </div>
                      
                      {/* Calculation breakdown */}
                      <div className="text-xs space-y-1 px-2 py-1.5 bg-background/50 rounded border">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CA brut généré :</span>
                          <span>{formatCurrency(tech.grossRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-destructive/80">
                          <span>Commission plateforme ({tech.commissionRate}%) :</span>
                          <span>- {formatCurrency(tech.commissionAmount)}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1 mt-1">
                          <span>Net calculé :</span>
                          <span className="text-primary">{formatCurrency(tech.netRevenue)}</span>
                        </div>
                      </div>

                      {/* Editable amount */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Montant à verser :</span>
                        <div className="flex items-center gap-2">
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
