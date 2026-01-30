import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingApplication {
  id: string;
  user_id: string;
  company_name: string;
  siret: string;
  legal_status: string;
  skills: string[];
  years_experience: number;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
}

const SKILL_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

export function PendingTechniciansTab() {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<PendingApplication | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_applications')
        .select(`
          id,
          user_id,
          company_name,
          siret,
          legal_status,
          skills,
          years_experience,
          created_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user info for each application
      const applicationsWithUsers: PendingApplication[] = [];
      for (const app of data || []) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone')
          .eq('id', app.user_id)
          .single();

        if (userData) {
          applicationsWithUsers.push({
            ...app,
            user: userData,
          });
        }
      }

      setApplications(applicationsWithUsers);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Erreur lors du chargement des candidatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleAction = async () => {
    if (!selectedApp || !actionType) return;

    setProcessing(true);
    try {
      if (actionType === 'accept') {
        // Update application status
        await supabase
          .from('partner_applications')
          .update({ status: 'approved' })
          .eq('id', selectedApp.id);

        // Activate user account
        await supabase
          .from('users')
          .update({ is_active: true })
          .eq('id', selectedApp.user_id);

        // Add technician role
        await supabase
          .from('user_roles')
          .insert({
            user_id: selectedApp.user_id,
            role: 'technician',
          });

        // Send acceptance email
        await supabase.functions.invoke('notify-technician-application', {
          body: {
            technicianId: selectedApp.user_id,
            action: 'accepted',
            email: selectedApp.user.email,
            firstName: selectedApp.user.first_name,
          },
        });

        toast.success('Candidature acceptée et email envoyé');
      } else {
        // Update application status
        await supabase
          .from('partner_applications')
          .update({ status: 'rejected' })
          .eq('id', selectedApp.id);

        // Send rejection email
        await supabase.functions.invoke('notify-technician-application', {
          body: {
            technicianId: selectedApp.user_id,
            action: 'rejected',
            email: selectedApp.user.email,
            firstName: selectedApp.user.first_name,
            reason: rejectReason,
          },
        });

        toast.success('Candidature refusée et email envoyé');
      }

      setSelectedApp(null);
      setActionType(null);
      setRejectReason('');
      fetchApplications();
    } catch (error) {
      console.error('Error processing application:', error);
      toast.error('Erreur lors du traitement de la candidature');
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
          <CardTitle>Profils en attente de validation</CardTitle>
          <CardDescription>
            {applications.length} candidature(s) en attente d'examen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune candidature en attente
            </p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {app.user.first_name} {app.user.last_name}
                      </span>
                      <Badge variant="outline">{app.company_name}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.user.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {SKILL_LABELS[skill] || skill}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {app.years_experience} ans d'expérience • Soumis le{' '}
                      {format(new Date(app.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType(null);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType('accept');
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accepter
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType('reject');
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' ? 'Accepter la candidature' : 'Refuser la candidature'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept'
                ? `Vous êtes sur le point d'accepter la candidature de ${selectedApp?.user.first_name} ${selectedApp?.user.last_name}. Un email de confirmation sera envoyé.`
                : `Vous êtes sur le point de refuser la candidature de ${selectedApp?.user.first_name} ${selectedApp?.user.last_name}.`}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Raison du refus (optionnel)</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez la raison du refus..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={processing}>
              Annuler
            </Button>
            <Button
              variant={actionType === 'accept' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={processing}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
