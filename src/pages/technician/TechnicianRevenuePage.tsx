import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Euro, 
  Calendar,
  Clock,
  CheckCircle,
  Wallet,
  History
} from 'lucide-react';
import { services as api } from '@/services/factory';
import type { RevenueStats, MonthlyPayout } from '@/services/interfaces/revenue.interface';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TechnicianRevenuePage = () => {
  const { user } = useAuth();
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [monthlyPayout, setMonthlyPayout] = useState<MonthlyPayout | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<MonthlyPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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

  const loadHistory = async () => {
    if (historyLoaded || !user) return;
    setHistoryLoading(true);
    try {
      const history = await revenueService.getPayoutHistory(user.id);
      setPayoutHistory(history);
      setHistoryLoaded(true);
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

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

          {/* Tabs: Current / History */}
          <Tabs defaultValue="current" onValueChange={(v) => v === 'history' && loadHistory()}>
            <TabsList className="w-full">
              <TabsTrigger value="current" className="flex-1 gap-1">
                <Wallet className="h-4 w-4" />
                Versement en cours
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1">
                <History className="h-4 w-4" />
                Historique
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current">
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
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-5 w-5 text-primary" />
                    Historique des versements
                  </CardTitle>
                  <CardDescription>
                    Tous les versements effectués
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <p className="text-center text-muted-foreground py-4">Chargement...</p>
                  ) : payoutHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Aucun versement effectué pour le moment
                    </p>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Période</TableHead>
                              <TableHead className="text-right">Brut</TableHead>
                              <TableHead className="text-right">Commission</TableHead>
                              <TableHead className="text-right">Net versé</TableHead>
                              <TableHead className="text-right">Date de versement</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payoutHistory.map((p, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-sm">
                                  {format(p.periodStart, 'MMM yyyy', { locale: fr })}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatCurrency(p.grossRevenue)}
                                </TableCell>
                                <TableCell className="text-right text-sm text-destructive">
                                  -{p.commissionRate}%
                                </TableCell>
                                <TableCell className="text-right text-sm font-semibold text-green-600">
                                  {formatCurrency(p.netRevenue)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {p.paidAt ? format(p.paidAt, 'dd/MM/yyyy', { locale: fr }) : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile cards */}
                      <div className="sm:hidden space-y-3">
                        {payoutHistory.map((p, idx) => (
                          <div key={idx} className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm capitalize">
                                {format(p.periodStart, 'MMMM yyyy', { locale: fr })}
                              </span>
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Versé
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Brut</p>
                                <p className="font-medium">{formatCurrency(p.grossRevenue)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Commission</p>
                                <p className="font-medium text-destructive">-{p.commissionRate}%</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              <div>
                                <p className="text-xs text-muted-foreground">Net versé</p>
                                <p className="font-bold text-green-600">{formatCurrency(p.netRevenue)}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {p.paidAt ? format(p.paidAt, 'dd/MM/yyyy', { locale: fr }) : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </TechnicianLayout>
  );
};

export default TechnicianRevenuePage;
