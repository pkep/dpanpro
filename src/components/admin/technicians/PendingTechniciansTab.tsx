import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Loader2, Briefcase, MapPin, FileText } from 'lucide-react';
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
  address: string;
  postal_code: string;
  city: string;
  birth_date: string;
  birth_place: string;
  insurance_company: string;
  insurance_policy_number: string;
  insurance_expiry_date: string;
  has_decennial_insurance: boolean;
  vat_number: string | null;
  presentation: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
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
  const [showDetails, setShowDetails] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_applications')
        .select(`
          id, user_id, company_name, siret, legal_status, skills,
          years_experience, created_at, address, postal_code, city,
          birth_date, birth_place, insurance_company, insurance_policy_number,
          insurance_expiry_date, has_decennial_insurance, vat_number, presentation,
          bank_account_holder, bank_name, iban, bic
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
        // Mark application as approved
        await supabase
          .from('partner_applications')
          .update({ status: 'approved' })
          .eq('id', selectedApp.id);

        // Add technician role but keep account INACTIVE until email activation
        await supabase
          .from('user_roles')
          .insert({
            user_id: selectedApp.user_id,
            role: 'technician',
          });

        // Send acceptance email with activation link
        await supabase.functions.invoke('notify-technician-application', {
          body: {
            technicianId: selectedApp.user_id,
            action: 'accepted',
            email: selectedApp.user.email,
            firstName: selectedApp.user.first_name,
          },
        });

        toast.success('Candidature acceptée. Un email d\'activation a été envoyé au technicien.');
      } else {
        await supabase
          .from('partner_applications')
          .update({ status: 'rejected' })
          .eq('id', selectedApp.id);

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
      setShowDetails(false);
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
                  className="border rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">
                        {app.user.first_name} {app.user.last_name}
                      </span>
                      <Badge variant="outline">{app.company_name}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{app.user.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {SKILL_LABELS[skill] || skill}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {app.years_experience} ans d'exp. • {format(new Date(app.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        setSelectedApp(app);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType('accept');
                      }}
                    >
                      <CheckCircle className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Accepter</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        setSelectedApp(app);
                        setActionType('reject');
                      }}
                    >
                      <XCircle className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Refuser</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Détails de la candidature
            </DialogTitle>
            <DialogDescription>
              {selectedApp?.user.first_name} {selectedApp?.user.last_name} — {selectedApp?.company_name}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              {/* Personal info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Informations personnelles</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom :</span>
                    <p className="font-medium">{selectedApp.user.first_name} {selectedApp.user.last_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email :</span>
                    <p className="font-medium">{selectedApp.user.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone :</span>
                    <p className="font-medium">{selectedApp.user.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date de naissance :</span>
                    <p className="font-medium">{format(new Date(selectedApp.birth_date), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lieu de naissance :</span>
                    <p className="font-medium">{selectedApp.birth_place}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Professional info */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  Informations professionnelles
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entreprise :</span>
                    <p className="font-medium">{selectedApp.company_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Statut juridique :</span>
                    <p className="font-medium">{selectedApp.legal_status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SIRET :</span>
                    <p className="font-medium font-mono">{selectedApp.siret}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">N° TVA :</span>
                    <p className="font-medium font-mono">{selectedApp.vat_number || 'Non renseigné'}</p>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Adresse :
                  </span>
                  <p className="font-medium">{selectedApp.address}, {selectedApp.postal_code} {selectedApp.city}</p>
                </div>
                {selectedApp.kbis_url && (
                  <div className="mt-2">
                    <a
                      href={selectedApp.kbis_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Voir l'extrait Kbis
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              {/* Skills */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Compétences & expérience</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedApp.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {SKILL_LABELS[skill] || skill}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{selectedApp.years_experience} ans d'expérience</p>
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground">Motivation :</span>
                  <p className="text-sm mt-1 bg-muted/50 p-2 rounded">{selectedApp.motivation}</p>
                </div>
              </div>

              <Separator />

              {/* Insurance */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Assurance</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Compagnie :</span>
                    <p className="font-medium">{selectedApp.insurance_company}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">N° Police :</span>
                    <p className="font-medium font-mono">{selectedApp.insurance_policy_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expiration :</span>
                    <p className="font-medium">{format(new Date(selectedApp.insurance_expiry_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Décennale :</span>
                    <Badge variant={selectedApp.has_decennial_insurance ? 'default' : 'secondary'}>
                      {selectedApp.has_decennial_insurance ? 'Oui' : 'Non'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Banking */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Coordonnées bancaires</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Banque :</span>
                    <p className="font-medium">{selectedApp.bank_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Titulaire :</span>
                    <p className="font-medium">{selectedApp.bank_account_holder}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">IBAN :</span>
                    <p className="font-medium font-mono text-xs">{selectedApp.iban}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">BIC :</span>
                    <p className="font-medium font-mono">{selectedApp.bic}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Fermer
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowDetails(false);
                setActionType('accept');
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Accepter
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDetails(false);
                setActionType('reject');
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
