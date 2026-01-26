import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Euro, 
  Calendar,
  Clock,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { revenueService, type RevenueStats, type PaymentPeriod } from '@/services/revenue/revenue.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TechnicianRevenuePage = () => {
  const { user } = useAuth();
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [paymentPeriods, setPaymentPeriods] = useState<PaymentPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [revenue, periods] = await Promise.all([
          revenueService.getRevenueStats(user.id),
          revenueService.getPaymentPeriods(user.id),
        ]);

        setRevenueStats(revenue);
        setPaymentPeriods(periods);
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
          {/* Revenue Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aujourd'hui
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Euro className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">
                    {revenueStats?.today?.toFixed(0) || 0}€
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cette semaine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Euro className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">
                    {revenueStats?.thisWeek?.toFixed(0) || 0}€
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ce mois-ci
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  <Euro className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">
                    {revenueStats?.thisMonth?.toFixed(0) || 0}€
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Prochains versements
              </CardTitle>
              <CardDescription>
                Vos gains seront versés selon le planning suivant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentPeriods.map((period, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-3">
                    {/* Period Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Semaine du {format(period.startDate, 'dd/MM/yy', { locale: fr })} au {format(period.endDate, 'dd/MM/yy', { locale: fr })}
                        </span>
                      </div>
                      {period.isPaid ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Versé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          <Clock className="h-3 w-3 mr-1" />
                          À venir
                        </Badge>
                      )}
                    </div>

                    {/* Period Details */}
                    <div className="grid grid-cols-4 gap-4 bg-muted/50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Brut</p>
                        <p className="font-medium">{formatCurrency(period.grossRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Commission</p>
                        <p className="font-medium text-destructive">-{period.commissionRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net à encaisser</p>
                        <p className="font-bold text-green-600">{formatCurrency(period.netRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {period.isPaid ? 'Versé le' : 'Prévu le'}
                        </p>
                        <p className="font-medium">
                          {format(period.paymentDate, 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {paymentPeriods.length === 0 && (
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
