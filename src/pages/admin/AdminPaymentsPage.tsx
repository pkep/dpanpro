import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Search, RefreshCw, DollarSign, ArrowRight } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentRow {
  id: string;
  intervention_id: string | null;
  amount_authorized: number;
  currency: string;
  status: string;
  client_email: string | null;
  provider_payment_id: string | null;
  created_at: string;
  captured_at: string | null;
  cancelled_at: string | null;
  // joined
  intervention_title?: string;
  intervention_address?: string;
  intervention_city?: string;
  intervention_status?: string;
  client_name?: string;
  isCancellationFee?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  authorized: 'Autorisé',
  captured: 'Payé',
  cancelled: 'Annulé',
  failed: 'Échoué',
  expired: 'Expiré',
};

const STATUS_VARIANTS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  authorized: 'bg-blue-100 text-blue-800 border-blue-200',
  captured: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/10 text-destructive',
  expired: 'bg-orange-100 text-orange-800 border-orange-200',
};

const EXPIRY_DAYS = 6;

function getEffectiveStatus(status: string, createdAt: string): string {
  if (status === 'pending' && differenceInDays(new Date(), new Date(createdAt)) >= EXPIRY_DAYS) {
    return 'expired';
  }
  return status;
}

const PAGE_SIZE = 10;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{ type: 'capture' | 'refund'; payment: PaymentRow } | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data: paData, error } = await supabase
        .from('payment_authorizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get intervention details
      const interventionIds = [...new Set((paData || []).map(p => p.intervention_id).filter(Boolean))];
      let interventionsMap: Record<string, any> = {};
      if (interventionIds.length > 0) {
        const { data: intData } = await supabase
          .from('interventions')
          .select('id, title, address, city, client_id, status, final_price')
          .in('id', interventionIds);
        if (intData) {
          const clientIds = [...new Set(intData.map(i => i.client_id).filter(Boolean))];
          let clientsMap: Record<string, string> = {};
          if (clientIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, first_name, last_name')
              .in('id', clientIds);
            if (usersData) {
              usersData.forEach(u => {
                clientsMap[u.id] = `${u.first_name} ${u.last_name}`;
              });
            }
          }
          intData.forEach(i => {
            interventionsMap[i.id] = {
              title: i.title,
              address: i.address,
              city: i.city,
              status: i.status,
              finalPrice: i.final_price,
              clientName: i.client_id ? clientsMap[i.client_id] || '' : '',
            };
          });
        }
      }

      const rows: PaymentRow[] = (paData || []).map(p => {
        const intInfo = p.intervention_id ? interventionsMap[p.intervention_id] : null;
        // A cancellation fee is identified when the intervention is cancelled and the payment was captured
        const isCancellationFee = intInfo?.status === 'cancelled' && p.status === 'captured';
        return {
          id: p.id,
          intervention_id: p.intervention_id,
          amount_authorized: p.amount_authorized,
          currency: p.currency,
          status: getEffectiveStatus(p.status, p.created_at),
          client_email: p.client_email,
          provider_payment_id: p.provider_payment_id,
          created_at: p.created_at,
          captured_at: p.captured_at,
          cancelled_at: p.cancelled_at,
          intervention_title: intInfo?.title,
          intervention_address: intInfo?.address,
          intervention_city: intInfo?.city,
          intervention_status: intInfo?.status,
          client_name: intInfo?.clientName || p.client_email || '—',
          isCancellationFee,
        };
      });

      setPayments(rows);
    } catch (err: any) {
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const filtered = useMemo(() => {
    let result = payments;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (dateFilter) {
        case 'today': cutoff = startOfDay(now); break;
        case 'week': cutoff = startOfWeek(now, { weekStartsOn: 1 }); break;
        case 'month': cutoff = startOfMonth(now); break;
        case 'year': cutoff = startOfYear(now); break;
        default: cutoff = new Date(0);
      }
      result = result.filter(p => new Date(p.created_at) >= cutoff);
    }

    // Text search
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      result = result.filter(p =>
        (p.client_name || '').toLowerCase().includes(s) ||
        (p.client_email || '').toLowerCase().includes(s) ||
        (p.intervention_address || '').toLowerCase().includes(s) ||
        (p.intervention_city || '').toLowerCase().includes(s) ||
        (p.intervention_title || '').toLowerCase().includes(s) ||
        (p.intervention_id || '').toLowerCase().includes(s)
      );
    }

    return result;
  }, [payments, statusFilter, dateFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, dateFilter, searchText]);

  // Actions
  const handleCapture = async () => {
    if (!actionDialog || actionDialog.type !== 'capture') return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('capture-payment', {
        body: {
          authorizationId: actionDialog.payment.id,
          amount: actionDialog.payment.amount_authorized,
        },
      });
      if (error) throw error;
      toast.success('Paiement capturé avec succès');
      setActionDialog(null);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la capture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!actionDialog || actionDialog.type !== 'refund') return;
    setActionLoading(true);
    try {
      const amount = refundType === 'full'
        ? actionDialog.payment.amount_authorized
        : parseFloat(refundAmount);

      if (!amount || amount <= 0) {
        toast.error('Montant invalide');
        setActionLoading(false);
        return;
      }

      const { error } = await supabase.functions.invoke('process-dispute-refund', {
        body: {
          interventionId: actionDialog.payment.intervention_id,
          refundType: refundType === 'full' ? 'full' : 'partial',
          refundAmount: refundType === 'partial' ? amount : undefined,
          adminNotes: `Remboursement ${refundType === 'full' ? 'total' : 'partiel'} depuis gestion paiements`,
        },
      });
      if (error) throw error;
      toast.success('Remboursement effectué avec succès');
      setActionDialog(null);
      setRefundAmount('');
      setRefundType('full');
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du remboursement');
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const authorized = payments.filter(p => p.status === 'authorized');
    const captured = payments.filter(p => p.status === 'captured');
    const cancelled = payments.filter(p => p.status === 'cancelled');
    return {
      total: payments.length,
      authorizedCount: authorized.length,
      authorizedAmount: authorized.reduce((s, p) => s + p.amount_authorized, 0),
      capturedCount: captured.length,
      capturedAmount: captured.reduce((s, p) => s + p.amount_authorized, 0),
      cancelledCount: cancelled.length,
    };
  }, [payments]);

  return (
    <AdminLayout title="Gestion des Paiements" subtitle="Suivi et actions sur les paiements">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Total paiements</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Autorisés</div>
              <div className="text-2xl font-bold text-blue-600">{stats.authorizedCount}</div>
              <div className="text-xs text-muted-foreground">{stats.authorizedAmount.toFixed(2)} €</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Capturés (Payés)</div>
              <div className="text-2xl font-bold text-green-600">{stats.capturedCount}</div>
              <div className="text-xs text-muted-foreground">{stats.capturedAmount.toFixed(2)} €</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Annulés / Remboursés</div>
              <div className="text-2xl font-bold text-muted-foreground">{stats.cancelledCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par client, adresse, intervention..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="authorized">Autorisé</SelectItem>
                  <SelectItem value="captured">Payé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchPayments} title="Rafraîchir">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiements ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Intervention</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun paiement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {p.client_name}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {p.intervention_title || '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {p.intervention_address ? `${p.intervention_address}, ${p.intervention_city || ''}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1">
                          <span>{p.amount_authorized.toFixed(2)} €</span>
                          {p.isCancellationFee && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] px-1.5 py-0">
                              Frais d'annulation
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_VARIANTS[p.status] || ''}>
                          {STATUS_LABELS[p.status] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {p.status === 'authorized' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1"
                              onClick={() => setActionDialog({ type: 'capture', payment: p })}
                            >
                              <DollarSign className="h-3 w-3" />
                              Capturer
                            </Button>
                          )}
                          {p.status === 'captured' && p.intervention_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => {
                                setRefundType('full');
                                setRefundAmount(p.amount_authorized.toString());
                                setActionDialog({ type: 'refund', payment: p });
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Rembourser
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <PaginationItem key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="px-2 text-muted-foreground">…</span>
                          )}
                          <PaginationLink
                            isActive={p === currentPage}
                            onClick={() => setCurrentPage(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Capture Dialog */}
      <Dialog open={actionDialog?.type === 'capture'} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capturer le paiement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vous allez capturer le montant autorisé de{' '}
            <span className="font-semibold text-foreground">
              {actionDialog?.payment.amount_authorized.toFixed(2)} €
            </span>{' '}
            pour le client <span className="font-semibold text-foreground">{actionDialog?.payment.client_name}</span>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Annuler</Button>
            <Button onClick={handleCapture} disabled={actionLoading}>
              {actionLoading ? 'Traitement...' : 'Confirmer la capture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={actionDialog?.type === 'refund'} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rembourser le paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paiement de{' '}
              <span className="font-semibold text-foreground">
                {actionDialog?.payment.amount_authorized.toFixed(2)} €
              </span>{' '}
              pour <span className="font-semibold text-foreground">{actionDialog?.payment.client_name}</span>.
            </p>

            <div className="space-y-2">
              <Label>Type de remboursement</Label>
              <Select value={refundType} onValueChange={(v) => {
                setRefundType(v as 'full' | 'partial');
                if (v === 'full' && actionDialog) {
                  setRefundAmount(actionDialog.payment.amount_authorized.toString());
                } else {
                  setRefundAmount('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Remboursement total</SelectItem>
                  <SelectItem value="partial">Remboursement partiel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {refundType === 'partial' && (
              <div className="space-y-2">
                <Label>Montant à rembourser (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={actionDialog?.payment.amount_authorized}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Ex: 50.00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={actionLoading || (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0))}
            >
              {actionLoading ? 'Traitement...' : 'Confirmer le remboursement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
