import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, Briefcase, Star, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TechnicianData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface PartnerApplication {
  id: string;
  company_name: string;
  siret: string;
  vat_number: string | null;
  legal_status: string;
  address: string;
  postal_code: string;
  city: string;
  skills: string[];
  years_experience: number;
  insurance_company: string;
  insurance_policy_number: string;
  insurance_expiry_date: string;
  has_decennial_insurance: boolean;
  bank_name: string;
  bank_account_holder: string;
  iban: string;
  bic: string;
  birth_date: string;
  birth_place: string;
}

interface PartnerStats {
  average_rating: number | null;
  completed_interventions: number;
  total_interventions: number;
}

interface TechnicianDetailsModalProps {
  technician: TechnicianData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const SKILL_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

export function TechnicianDetailsModal({ technician, open, onOpenChange, onUpdate }: TechnicianDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (technician && open) {
      setFirstName(technician.first_name);
      setLastName(technician.last_name);
      setEmail(technician.email);
      setPhone(technician.phone || '');
      setIsActive(technician.is_active);
      fetchAdditionalData(technician.id);
    }
  }, [technician, open]);

  const fetchAdditionalData = async (userId: string) => {
    setLoading(true);
    try {
      const [appResult, statsResult] = await Promise.all([
        supabase
          .from('partner_applications')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('partner_statistics')
          .select('average_rating, completed_interventions, total_interventions')
          .eq('partner_id', userId)
          .single(),
      ]);

      if (appResult.data) {
        setApplication(appResult.data as PartnerApplication);
      }
      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error fetching additional data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!technician) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          is_active: isActive,
        })
        .eq('id', technician.id);

      if (error) throw error;

      toast.success('Informations mises à jour avec succès');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating technician:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newStatus = !isActive;
    setIsActive(newStatus);
    
    if (!newStatus) {
      toast.warning('Le technicien ne pourra plus se connecter à la plateforme');
    }
  };

  if (!technician) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {technician.first_name} {technician.last_name}
          </DialogTitle>
          <DialogDescription>
            Gérer les informations du technicien
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personnel</TabsTrigger>
              <TabsTrigger value="professional">Professionnel</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {application && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date de naissance :</span>
                      <p className="font-medium">
                        {format(new Date(application.birth_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lieu de naissance :</span>
                      <p className="font-medium">{application.birth_place}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Statut du compte</p>
                  <p className="text-sm text-muted-foreground">
                    {isActive 
                      ? 'Le technicien peut se connecter et recevoir des interventions'
                      : 'Le technicien ne peut plus se connecter à la plateforme'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? 'default' : 'destructive'}>
                    {isActive ? 'Actif' : 'Désactivé'}
                  </Badge>
                  <Switch
                    checked={isActive}
                    onCheckedChange={handleToggleActive}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4 mt-4">
              {application ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        Entreprise
                      </span>
                      <p className="font-medium">{application.company_name}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Statut juridique</span>
                      <p className="font-medium">{application.legal_status}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">SIRET</span>
                      <p className="font-medium font-mono">{application.siret}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">N° TVA</span>
                      <p className="font-medium font-mono">{application.vat_number || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Adresse
                    </span>
                    <p className="font-medium">
                      {application.address}, {application.postal_code} {application.city}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <span className="text-sm text-muted-foreground">Compétences</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {application.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {SKILL_LABELS[skill] || skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Expérience</span>
                    <p className="font-medium">{application.years_experience} ans</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Assurance</span>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Compagnie :</span>
                        <p className="font-medium">{application.insurance_company}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">N° Police :</span>
                        <p className="font-medium font-mono">{application.insurance_policy_number}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expiration :</span>
                        <p className="font-medium">
                          {format(new Date(application.insurance_expiry_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Décennale :</span>
                        <Badge variant={application.has_decennial_insurance ? 'default' : 'secondary'}>
                          {application.has_decennial_insurance ? 'Oui' : 'Non'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Coordonnées bancaires</span>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Banque :</span>
                        <p className="font-medium">{application.bank_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Titulaire :</span>
                        <p className="font-medium">{application.bank_account_holder}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">IBAN :</span>
                        <p className="font-medium font-mono text-xs">{application.iban}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BIC :</span>
                        <p className="font-medium font-mono">{application.bic}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucune information professionnelle disponible
                </p>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">
                    {stats?.average_rating ? Number(stats.average_rating).toFixed(1) : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {stats?.completed_interventions || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Interventions terminées</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <Briefcase className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">
                    {stats?.total_interventions || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total interventions</p>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Inscrit le {format(new Date(technician.created_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
