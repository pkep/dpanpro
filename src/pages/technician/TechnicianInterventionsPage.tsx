import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS } from '@/types/intervention.types';

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  assigned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  on_route: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  arrived: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function TechnicianInterventionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['technician-interventions', user?.id, page],
    queryFn: async () => {
      if (!user) return { items: [], count: 0 };
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('interventions')
        .select('*', { count: 'exact' })
        .eq('technician_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { items: data || [], count: count || 0 };
    },
    enabled: !!user,
  });

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  return (
    <TechnicianLayout title="Mes interventions" subtitle={`${data?.count || 0} intervention(s) au total`}>
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : data?.items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune intervention trouvée.
            </CardContent>
          </Card>
        ) : (
          data?.items.map((intervention) => {
            const categoryLabel = CATEGORY_LABELS[intervention.category as keyof typeof CATEGORY_LABELS] || intervention.category;
            const categoryIcon = CATEGORY_ICONS[intervention.category as keyof typeof CATEGORY_ICONS] || '🔧';
            const statusLabel = STATUS_LABELS[intervention.status as keyof typeof STATUS_LABELS] || intervention.status;

            return (
              <Card
                key={intervention.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/technician/intervention/${intervention.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{categoryIcon}</span>
                        <span className="font-medium truncate">{categoryLabel}</span>
                        <Badge className={STATUS_COLORS[intervention.status] || ''}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{intervention.address}, {intervention.postal_code} {intervention.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{new Date(intervention.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {intervention.final_price != null && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {Number(intervention.final_price).toFixed(2)} €
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </TechnicianLayout>
  );
}
