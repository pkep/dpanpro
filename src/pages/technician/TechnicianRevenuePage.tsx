import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Euro, 
  Calendar,
  Clock,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { revenueService, type RevenueStats, type MonthlyPayout } from '@/services/revenue/revenue.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TechnicianRevenuePage = () => {
  const { user } = useAuth();
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [monthlyPayout, setMonthlyPayout] = useState<MonthlyPayout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [revenue, payout] = await Promise.all([
          revenueService.getRevenueStats(user.id),
          revenueService.getMonthlyPayout(user.id),
        ]);

        setRevenueStats(revenue);
        setMonthlyPayout(payout);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <TechnicianLayout title="Revenus" subtitle="Suivi de vos gains">
      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Stats - Mobile optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                    <p className="text-xl font-bold">
                      {revenueStats?.today?.toFixed(0) || 0}€
                    </p>
                  </div>
                  <Euro className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Cette semaine</p>
                    <p className="text-xl font-bold">
                      {revenueStats?.thisWeek?.toFixed(0) || 0}€
                    </p>
                  </div>
                  <Euro className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ce mois</p>
                    <p className="text-xl font-bold">
                      {revenueStats?.thisMonth?.toFixed(0) || 0}€
                    </p>
                  </div>
                  <Euro className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Payout - Single period */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-5 w-5 text-primary" />
                Versement mensuel
              </CardTitle>
              <CardDescription>
                Récapitulatif du mois précédent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyPayout ? (
                <div className="space-y-4">
                  {/* Period Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">
                        {format(monthlyPayout.periodStart, 'dd MMM', { locale: fr })} - {format(monthlyPayout.periodEnd, 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    {monthlyPayout.isPaid ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 w-fit">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Versé le {format(monthlyPayout.paidAt!, 'dd/MM/yyyy', { locale: fr })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 w-fit">
                        <Clock className="h-3 w-3 mr-1" />
                        Prévu le {format(monthlyPayout.scheduledPaymentDate, 'dd/MM/yyyy', { locale: fr })}
                      </Badge>
                    )}
                  </div>

                  {/* Period Details - Mobile optimized */}
                  <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Brut</p>
                      <p className="font-medium text-sm">{formatCurrency(monthlyPayout.grossRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="font-medium text-sm text-destructive">-{monthlyPayout.commissionRate}%</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">Net à encaisser</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(monthlyPayout.netRevenue)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Aucun versement prévu
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </TechnicianLayout>
  );
};

export default TechnicianRevenuePage;
