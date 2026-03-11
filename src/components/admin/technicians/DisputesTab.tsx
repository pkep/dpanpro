import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, MessageSquare, Eye, Plus, RefreshCw, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Dispute {
  id: string;
  intervention_id: string;
  status: string;
  client_notes: string | null;
  technician_notes: string | null;
  admin_notes: string | null;
  resolution: string | null;
  refund_type: string | null;
  refund_amount: number | null;
  refund_stripe_id: string | null;
  created_at: string;
  resolved_at: string | null;
  intervention?: {
    title: string;
    category: string;
    tracking_code: string | null;
    final_price: number | null;
  };
  client?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  technician?: {
    first_name: string;
    last_name: string;
  };
}

interface CompletedIntervention {
  id: string;
  title: string;
  category: string;
  tracking_code: string | null;
  final_price: number | null;
  client_id: string | null;
  technician_id: string | null;
  address: string;
  city: string;
  client_name?: string;
  technician_name?: string;
}

interface TechnicianOption {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

export function DisputesTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  // Create dispute state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [completedInterventions, setCompletedInterventions] = useState<CompletedIntervention[]>([]);
  const [selectedInterventionId, setSelectedInterventionId] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [loadingInterventions, setLoadingInterventions] = useState(false);
  const [creating, setCreating] = useState(false);

  // Search filters for create dialog
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [filterTechnicianId, setFilterTechnicianId] = useState('all');
  const [filterAddress, setFilterAddress] = useState('');

  // Refund state
  const [refundType, setRefundType] = useState<'none' | 'full' | 'partial'>('none');
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedDisputes: Dispute[] = [];
      for (const dispute of data || []) {
        const { data: intData } = await supabase
          .from('interventions')
          .select('title, category, tracking_code, final_price')
          .eq('id', dispute.intervention_id)
          .single();

        let clientData = null;
        if (dispute.client_id) {
          const { data: cData } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', dispute.client_id)
            .single();
          clientData = cData;
        }

        let techData = null;
        if (dispute.technician_id) {
          const { data: tData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', dispute.technician_id)
            .single();
          techData = tData;
        }

        enrichedDisputes.push({
          ...dispute,
          intervention: intData || undefined,
          client: clientData || undefined,
          technician: techData || undefined,
        });
      }

      setDisputes(enrichedDisputes);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Erreur lors du chargement des litiges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchCompletedInterventions = async () => {
    setLoadingInterventions(true);
    try {
      const { data, error } = await supabase
        .from('interventions')
        .select('id, title, category, tracking_code, final_price, client_id, technician_id, address, city')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Build unique technician list
      const techIds = [...new Set((data || []).map(i => i.technician_id).filter(Boolean))] as string[];
      const techMap: Record<string, string> = {};
      for (const tid of techIds) {
        const { data: t } = await supabase.from('users').select('first_name, last_name').eq('id', tid).single();
        if (t) techMap[tid] = `${t.first_name} ${t.last_name}`;
      }
      setTechnicians(techIds.map(id => ({ id, name: techMap[id] || id })));

      const clientIds = [...new Set((data || []).map(i => i.client_id).filter(Boolean))] as string[];
      const clientMap: Record<string, string> = {};
      for (const cid of clientIds) {
        const { data: c } = await supabase.from('users').select('first_name, last_name').eq('id', cid).single();
        if (c) clientMap[cid] = `${c.first_name} ${c.last_name}`;
      }

      const enriched: CompletedIntervention[] = (data || []).map(int => ({
        ...int,
        address: int.address || '',
        city: int.city || '',
        client_name: int.client_id ? clientMap[int.client_id] || '' : '',
        technician_name: int.technician_id ? techMap[int.technician_id] || '' : '',
      }));

      setCompletedInterventions(enriched);
    } catch (error) {
      console.error('Error fetching interventions:', error);
      toast.error('Erreur lors du chargement des interventions');
    } finally {
      setLoadingInterventions(false);
    }
  };

  const openCreateDialog = () => {
    setShowCreateDialog(true);
    setSelectedInterventionId('');
    setClientNotes('');
    setTechnicianNotes('');
    setFilterTechnicianId('all');
    setFilterAddress('');
    fetchCompletedInterventions();
  };

  const filteredInterventions = completedInterventions.filter(int => {
    if (filterTechnicianId !== 'all' && int.technician_id !== filterTechnicianId) return false;
    if (filterAddress.trim()) {
      const search = filterAddress.toLowerCase();
      const matchAddress = int.address.toLowerCase().includes(search);
      const matchCity = int.city.toLowerCase().includes(search);
      if (!matchAddress && !matchCity) return false;
    }
    return true;
  });

  const handleCreateDispute = async () => {
    if (!selectedInterventionId) {
      toast.error('Veuillez sélectionner une intervention');
      return;
    }

    setCreating(true);
    try {
      const intervention = completedInterventions.find(i => i.id === selectedInterventionId);
      if (!intervention) throw new Error('Intervention non trouvée');

      const { error } = await supabase
        .from('disputes')
        .insert({
          intervention_id: selectedInterventionId,
          client_id: intervention.client_id,
          technician_id: intervention.technician_id,
          client_notes: clientNotes || null,
          technician_notes: technicianNotes || null,
          status: 'open',
        });

      if (error) throw error;

      toast.success('Litige créé avec succès');
      setShowCreateDialog(false);
      fetchDisputes();
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast.error('Erreur lors de la création du litige');
    } finally {
      setCreating(false);
    }
  };

  const openDisputeDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setAdminNotes(dispute.admin_notes || '');
    setResolution(dispute.resolution || '');
    setNewStatus(dispute.status);
    setRefundType(dispute.refund_type as 'none' | 'full' | 'partial' || 'none');
    setRefundAmount(dispute.refund_amount?.toString() || '');
    setRefunding(false);
  };

  const handleProcessRefund = async () => {
    if (!selectedDispute) return;
    if (refundType === 'none') {
      toast.error('Veuillez sélectionner un type de remboursement');
      return;
    }
    if (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }

    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-dispute-refund', {
        body: {
          disputeId: selectedDispute.id,
          interventionId: selectedDispute.intervention_id,
          refundType,
          refundAmount: refundType === 'partial' ? parseFloat(refundAmount) : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        refundType === 'full'
          ? `Remboursement total de ${data.amount?.toFixed(2)} € effectué`
          : `Remboursement partiel de ${data.amount?.toFixed(2)} € effectué`
      );
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error?.message || 'Erreur lors du remboursement');
    } finally {
      setRefunding(false);
    }
  };

  const handleUpdateDispute = async () => {
    if (!selectedDispute) return;

    setProcessing(true);
    try {
      const updates: Record<string, unknown> = {
        admin_notes: adminNotes || null,
        status: newStatus,
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updates.resolution = resolution || null;
        updates.resolved_at = new Date().toISOString();
        if (refundType !== 'none' && !selectedDispute.refund_stripe_id) {
          updates.refund_type = refundType;
        }
      }

      const { error } = await supabase
        .from('disputes')
        .update(updates)
        .eq('id', selectedDispute.id);

      if (error) throw error;

      toast.success('Litige mis à jour');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error) {
      console.error('Error updating dispute:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600">{STATUS_LABELS[status]}</Badge>;
      case 'closed':
        return <Badge variant="outline">{STATUS_LABELS[status]}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRefundBadge = (dispute: Dispute) => {
    if (!dispute.refund_type) return null;
    if (dispute.refund_type === 'full') {
      return (
        <Badge className="bg-emerald-600 text-white text-xs">
          Remb. total {dispute.refund_amount?.toFixed(2)} €
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-600 text-white text-xs">
        Remb. partiel {dispute.refund_amount?.toFixed(2)} €
      </Badge>
    );
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

  const selectedIntervention = completedInterventions.find(i => i.id === selectedInterventionId);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Gestion des litiges</CardTitle>
            <CardDescription>
              {disputes.filter((d) => d.status === 'open').length} litige(s) ouvert(s)
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouveau litige
          </Button>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun litige enregistré
            </p>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                      <span className="font-medium truncate">
                        {dispute.intervention?.title || 'Intervention'}
                      </span>
                      {getStatusBadge(dispute.status)}
                      {getRefundBadge(dispute)}
                      {dispute.intervention?.tracking_code && (
                        <Badge variant="outline" className="text-xs">
                          {dispute.intervention.tracking_code}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground mb-2 space-y-0.5">
                      <p className="truncate">
                        Client : {dispute.client?.first_name} {dispute.client?.last_name}{' '}
                        <span className="hidden sm:inline">({dispute.client?.email})</span>
                      </p>
                      <p>
                        Tech. : {dispute.technician?.first_name} {dispute.technician?.last_name}
                      </p>
                      {dispute.intervention?.final_price && (
                        <p>Montant facturé : {dispute.intervention.final_price.toFixed(2)} €</p>
                      )}
                    </div>

                    {dispute.client_notes && (
                      <div className="bg-red-50 dark:bg-red-950 rounded p-2 mb-2">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Version client :</p>
                        <p className="text-sm text-red-600 dark:text-red-400 line-clamp-2">{dispute.client_notes}</p>
                      </div>
                    )}

                    {dispute.technician_notes && (
                      <div className="bg-blue-50 dark:bg-blue-950 rounded p-2">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Version technicien :</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 line-clamp-2">{dispute.technician_notes}</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(dispute.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>

                  <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0" onClick={() => openDisputeDetails(dispute)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Gérer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dispute Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ouvrir un litige</DialogTitle>
            <DialogDescription>
              Sélectionnez l'intervention concernée et recueillez les versions des deux parties.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Filters */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Filtrer par technicien</Label>
                <Select value={filterTechnicianId} onValueChange={(v) => { setFilterTechnicianId(v); setSelectedInterventionId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les techniciens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les techniciens</SelectItem>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Filtrer par adresse / ville</Label>
                <Input
                  value={filterAddress}
                  onChange={(e) => { setFilterAddress(e.target.value); setSelectedInterventionId(''); }}
                  placeholder="Rechercher une adresse..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Intervention ({filteredInterventions.length} résultat{filteredInterventions.length > 1 ? 's' : ''})</Label>
              {loadingInterventions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <Select value={selectedInterventionId} onValueChange={setSelectedInterventionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une intervention..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInterventions.map((int) => (
                      <SelectItem key={int.id} value={int.id}>
                        <span className="flex flex-col">
                          <span>{int.tracking_code || int.title} — {CATEGORY_LABELS[int.category] || int.category}</span>
                          <span className="text-xs text-muted-foreground">
                            {int.client_name} / {int.technician_name}
                            {int.final_price ? ` — ${int.final_price.toFixed(2)} €` : ''}
                          </span>
                          <span className="text-xs text-muted-foreground">{int.address}, {int.city}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedIntervention && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p><strong>{selectedIntervention.title}</strong></p>
                <p>Client : {selectedIntervention.client_name || 'N/A'}</p>
                <p>Technicien : {selectedIntervention.technician_name || 'N/A'}</p>
                <p>Adresse : {selectedIntervention.address}, {selectedIntervention.city}</p>
                {selectedIntervention.final_price && (
                  <p>Montant facturé : <strong>{selectedIntervention.final_price.toFixed(2)} €</strong></p>
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Version du technicien
              </Label>
              <Textarea
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="Décrivez la version des faits du technicien..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-500" />
                Version du client
              </Label>
              <Textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Décrivez la version des faits du client..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={handleCreateDispute} disabled={creating || !selectedInterventionId}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le litige
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Details / Resolution Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer le litige</DialogTitle>
            <DialogDescription>
              {selectedDispute?.intervention?.title} — {selectedDispute?.intervention?.tracking_code}
              {selectedDispute?.intervention?.final_price && (
                <span className="ml-2 font-medium">
                  ({selectedDispute.intervention.final_price.toFixed(2)} €)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Versions */}
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedDispute?.technician_notes && (
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Version technicien
                  </p>
                  <p className="text-sm">{selectedDispute.technician_notes}</p>
                </div>
              )}

              {selectedDispute?.client_notes && (
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Version client
                  </p>
                  <p className="text-sm">{selectedDispute.client_notes}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Admin notes */}
            <div className="space-y-2">
              <Label>Notes administrateur</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ajouter des notes internes..."
                rows={3}
              />
            </div>

            {(newStatus === 'resolved' || newStatus === 'closed') && (
              <div className="space-y-2">
                <Label>Résolution</Label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Décrire la résolution du litige..."
                  rows={3}
                />
              </div>
            )}

            <Separator />

            {/* Refund section */}
            {selectedDispute?.refund_stripe_id ? (
              <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-2">
                  <Euro className="h-4 w-4" />
                  Remboursement effectué
                </p>
                <p className="text-sm">
                  {selectedDispute.refund_type === 'full' ? 'Remboursement total' : 'Geste commercial (partiel)'} :{' '}
                  <strong>{selectedDispute.refund_amount?.toFixed(2)} €</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Réf. Stripe : {selectedDispute.refund_stripe_id}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Remboursement
                </p>

                <div className="space-y-2">
                  <Label>Type de remboursement</Label>
                  <Select value={refundType} onValueChange={(v) => setRefundType(v as 'none' | 'full' | 'partial')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun remboursement</SelectItem>
                      <SelectItem value="full">Remboursement total</SelectItem>
                      <SelectItem value="partial">Geste commercial (montant partiel)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {refundType === 'full' && selectedDispute?.intervention?.final_price && (
                  <div className="bg-amber-50 dark:bg-amber-950 rounded p-3">
                    <p className="text-sm">
                      Montant à rembourser : <strong>{selectedDispute.intervention.final_price.toFixed(2)} €</strong>
                    </p>
                  </div>
                )}

                {refundType === 'partial' && (
                  <div className="space-y-2">
                    <Label>Montant du remboursement (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedDispute?.intervention?.final_price || undefined}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Ex: 50.00"
                    />
                    {selectedDispute?.intervention?.final_price && (
                      <p className="text-xs text-muted-foreground">
                        Montant facturé : {selectedDispute.intervention.final_price.toFixed(2)} €
                      </p>
                    )}
                  </div>
                )}

                {refundType !== 'none' && (
                  <Button
                    variant="destructive"
                    onClick={handleProcessRefund}
                    disabled={refunding || (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0))}
                    className="w-full"
                  >
                    {refunding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {refundType === 'full'
                      ? 'Effectuer le remboursement total via Stripe'
                      : `Rembourser ${refundAmount || '...'} € via Stripe`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)} disabled={processing || refunding}>
              Fermer
            </Button>
            <Button onClick={handleUpdateDispute} disabled={processing || refunding}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
