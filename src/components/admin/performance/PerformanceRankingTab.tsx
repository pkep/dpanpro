import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Trophy, Medal, Star, TrendingUp, Briefcase } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '@/services/performance/performance.service';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800">
        <Medal className="h-5 w-5 text-slate-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Medal className="h-5 w-5 text-amber-700 dark:text-amber-600" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
      <span className="font-bold text-muted-foreground">{rank}</span>
    </div>
  );
}

export function PerformanceRankingTab() {
  const { data: topTechnicians, isLoading } = useQuery({
    queryKey: ['top-technicians'],
    queryFn: () => performanceService.getTopTechnicians(7),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classement des Techniciens</CardTitle>
        <CardDescription>Top 7 des techniciens les plus performants ce mois</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : topTechnicians && topTechnicians.length > 0 ? (
          <div className="space-y-4">
            {topTechnicians.map((tech, index) => (
              <div
                key={tech.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800' 
                    : 'bg-card'
                }`}
              >
                {getRankBadge(index + 1)}
                
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {tech.firstName.charAt(0)}{tech.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {tech.firstName} {tech.lastName}
                  </p>
                  {tech.companyName && (
                    <p className="text-sm text-muted-foreground truncate">{tech.companyName}</p>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-6">
                  {/* Revenue */}
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-primary">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-bold">{formatCurrency(tech.revenue)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">CA Généré</p>
                  </div>

                  {/* Interventions */}
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{tech.completedInterventions}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Interventions</p>
                  </div>

                  {/* Rating */}
                  <div className="text-center min-w-[60px]">
                    {tech.avgRating ? (
                      <>
                        <div className="flex items-center gap-1 justify-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold">{tech.avgRating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Note</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                {/* Mobile view stats */}
                <div className="sm:hidden flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="font-bold">
                    {formatCurrency(tech.revenue)}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tech.completedInterventions} interv.</span>
                    {tech.avgRating && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {tech.avgRating.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucun technicien à afficher
          </p>
        )}
      </CardContent>
    </Card>
  );
}
