import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, Loader2, Search, Briefcase, MapPin, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RejectedApplication {
  id: string;
  user_id: string;
  company_name: string;
  siret: string;
  legal_status: string;
  skills: string[];
  years_experience: number;
  created_at: string;
  updated_at: string;
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

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const SKILL_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

const PAGE_SIZE = 10;

export function RejectedTechniciansTab() {
  const [applications, setApplications] = useState<RejectedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [selectedApp, setSelectedApp] = useState<RejectedApplication | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getDateRange = useCallback((): { from: string | null; to: string | null } => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { from: startOfDay(now).toISOString(), to: null };
      case 'week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: null };
      case 'month':
        return { from: startOfMonth(now).toISOString(), to: null };
      case 'year':
        return { from: startOfYear(now).toISOString(), to: null };
      case 'custom':
        return {
          from: customDateStart ? new Date(customDateStart).toISOString() : null,
          to: customDateEnd ? new Date(customDateEnd + 'T23:59:59').toISOString() : null,
        };
      default:
        return { from: null, to: null };
    }
  }, [dateFilter, customDateStart, customDateEnd]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;
      const dateRange = getDateRange();

      // Build query for count
      let countQuery = supabase
        .from('partner_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected');

      if (dateRange.from) countQuery = countQuery.gte('updated_at', dateRange.from);
      if (dateRange.to) countQuery = countQuery.lte('updated_at', dateRange.to);

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Build data query
      let dataQuery = supabase
        .from('partner_applications')
        .select(`
          id, user_id, company_name, siret, legal_status, skills,
          years_experience, created_at, updated_at, address, postal_code, city,
          birth_date, birth_place, insurance_company, insurance_policy_number,
          insurance_expiry_date, has_decennial_insurance, vat_number, presentation,
          bank_account_holder, bank_name, iban, bic
        `)
        .eq('status', 'rejected')
        .order('updated_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (dateRange.from) dataQuery = dataQuery.gte('updated_at', dateRange.from);
      if (dateRange.to) dataQuery = dataQuery.lte('updated_at', dateRange.to);

      const { data, error } = await dataQuery;
      if (error) throw error;

      // Fetch user info
      const applicationsWithUsers: RejectedApplication[] = [];
      for (const app of data || []) {
        if (!app.user_id) continue;
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone')
          .eq('id', app.user_id)
          .single();

        if (userData) {
          applicationsWithUsers.push({ ...app, user: userData });
        }
      }

      // Client-side search filter (name or email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const filtered = applicationsWithUsers.filter(
          (app) =>
            app.user.first_name.toLowerCase().includes(q) ||
            app.user.last_name.toLowerCase().includes(q) ||
            app.user.email.toLowerCase().includes(q)
        );
        setApplications(filtered);
      } else {
        setApplications(applicationsWithUsers);
      }
    } catch (error) {
      console.error('Error fetching rejected applications:', error);
      toast.error('Erreur lors du chargement des candidatures refusées');
    } finally {
      setLoading(false);
    }
  }, [currentPage, dateFilter, customDateStart, customDateEnd, searchQuery, getDateRange]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customDateStart, customDateEnd]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Candidatures refusées</CardTitle>
          <CardDescription>
            {totalCount} candidature(s) refusée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="custom">Entre deux dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Du</label>
                <Input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Au</label>
                <Input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune candidature refusée
            </p>
          ) : (
            <>
              <div className="space-y-3">
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
                        <Badge variant="destructive" className="text-xs">Refusée</Badge>
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
                        {app.years_experience} ans d'exp. • Candidature du {format(new Date(app.created_at), 'dd MMM yyyy', { locale: fr })} • Refusée le {format(new Date(app.updated_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApp(app);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Détails de la candidature refusée
            </DialogTitle>
            <DialogDescription>
              {selectedApp?.user.first_name} {selectedApp?.user.last_name} — {selectedApp?.company_name}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
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
                </div>
              </div>

              <Separator />

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
                    <MapPin className="h-3 w-3" /> Adresse :
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

              <div>
                <h4 className="text-sm font-semibold mb-2">Compétences</h4>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
