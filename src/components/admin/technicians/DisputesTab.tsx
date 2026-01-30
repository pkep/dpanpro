import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, MessageSquare, Eye } from 'lucide-react';
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
  created_at: string;
  resolved_at: string | null;
  intervention?: {
    title: string;
    category: string;
    tracking_code: string | null;
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

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with related data
      const enrichedDisputes: Dispute[] = [];
      for (const dispute of data || []) {
        // Get intervention details
        const { data: intData } = await supabase
          .from('interventions')
          .select('title, category, tracking_code')
          .eq('id', dispute.intervention_id)
          .single();

        // Get client info
        let clientData = null;
        if (dispute.client_id) {
          const { data: cData } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', dispute.client_id)
            .single();
          clientData = cData;
        }

        // Get technician info
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

  const openDisputeDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setAdminNotes(dispute.admin_notes || '');
    setResolution(dispute.resolution || '');
    setNewStatus(dispute.status);
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
          <CardTitle>Gestion des litiges</CardTitle>
          <CardDescription>
            {disputes.filter((d) => d.status === 'open').length} litige(s) ouvert(s)
          </CardDescription>
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
                  className="border rounded-lg p-4 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">
                        {dispute.intervention?.title || 'Intervention'}
                      </span>
                      {getStatusBadge(dispute.status)}
                      {dispute.intervention?.tracking_code && (
                        <Badge variant="outline" className="text-xs">
                          {dispute.intervention.tracking_code}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      <p>
                        Client : {dispute.client?.first_name} {dispute.client?.last_name}{' '}
                        ({dispute.client?.email})
                      </p>
                      <p>
                        Technicien : {dispute.technician?.first_name} {dispute.technician?.last_name}
                      </p>
                    </div>

                    {dispute.client_notes && (
                      <div className="bg-red-50 dark:bg-red-950 rounded p-2 mb-2">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                          Note client :
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {dispute.client_notes}
                        </p>
                      </div>
                    )}

                    {dispute.technician_notes && (
                      <div className="bg-blue-50 dark:bg-blue-950 rounded p-2">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                          Note technicien :
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {dispute.technician_notes}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Créé le {format(new Date(dispute.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => openDisputeDetails(dispute)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Gérer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Details Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gérer le litige</DialogTitle>
            <DialogDescription>
              {selectedDispute?.intervention?.title} -{' '}
              {selectedDispute?.intervention?.tracking_code}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedDispute?.client_notes && (
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Note client
                </p>
                <p className="text-sm">{selectedDispute.client_notes}</p>
              </div>
            )}

            {selectedDispute?.technician_notes && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Note technicien
                </p>
                <p className="text-sm">{selectedDispute.technician_notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes administrateur</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ajouter des notes internes..."
                rows={3}
              />
            </div>

            {(newStatus === 'resolved' || newStatus === 'closed') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Résolution</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Décrire la résolution du litige..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleUpdateDispute} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
