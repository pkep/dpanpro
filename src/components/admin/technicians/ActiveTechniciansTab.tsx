import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, Phone, Mail, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface ActiveTechnician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  skills: string[];
  average_rating: number | null;
  completed_interventions: number;
}

const SKILL_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

const PAGE_SIZE = 15;

export function ActiveTechniciansTab() {
  const [technicians, setTechnicians] = useState<ActiveTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      // Get active technicians (users with role technician and is_active = true)
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, created_at', { count: 'exact' })
        .eq('role', 'technician')
        .eq('is_active', true);

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setTotalCount(count || 0);

      // Enrich with skills and stats
      const enrichedTechnicians: ActiveTechnician[] = [];
      for (const tech of data || []) {
        // Get skills from partner_applications
        const { data: appData } = await supabase
          .from('partner_applications')
          .select('skills')
          .eq('user_id', tech.id)
          .single();

        // Get stats from partner_statistics
        const { data: statsData } = await supabase
          .from('partner_statistics')
          .select('average_rating, completed_interventions')
          .eq('partner_id', tech.id)
          .single();

        enrichedTechnicians.push({
          ...tech,
          skills: appData?.skills || [],
          average_rating: statsData?.average_rating ? Number(statsData.average_rating) : null,
          completed_interventions: statsData?.completed_interventions || 0,
        });
      }

      setTechnicians(enrichedTechnicians);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Erreur lors du chargement des techniciens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Techniciens actifs</CardTitle>
            <CardDescription>
              {totalCount} technicien(s) sur la plateforme
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
            <div className="space-y-3">
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">
                        {tech.first_name} {tech.last_name}
                      </span>
                      {tech.average_rating && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm">{tech.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                      <Badge variant="secondary">
                        {tech.completed_interventions} intervention(s)
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {tech.email}
                      </span>
                      {tech.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tech.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tech.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {SKILL_LABELS[skill] || skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
  );
}
