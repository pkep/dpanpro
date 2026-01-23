import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Target, 
  Star, 
  Euro, 
  Calendar,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { revenueService, type WeeklyStats, type PerformanceStats } from '@/services/revenue/revenue.service';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TechnicianStatsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [performance, weekly, insurance] = await Promise.all([
          revenueService.getPerformanceStats(user.id),
          revenueService.getWeeklyStats(user.id),
          revenueService.getInsuranceExpiryDate(user.id),
        ]);

        setPerformanceStats(performance);
        setWeeklyStats(weekly);
        setInsuranceExpiryDate(insurance);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const daysUntilExpiry = insuranceExpiryDate 
    ? differenceInDays(insuranceExpiryDate, new Date())
    : null;

  const showInsuranceAlert = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/technician')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">Tableau de bord</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Performances Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">{performanceStats?.completedMissions || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Missions complétées</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">{performanceStats?.acceptanceRate || 0}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Taux d'acceptation</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-2xl font-bold">
                    {performanceStats?.averageRating?.toFixed(1) || '-'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Note moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Semaine en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Euro className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">
                    {weeklyStats?.grossRevenue?.toFixed(0) || 0}€
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Revenu brut</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">{weeklyStats?.missionsCount || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Missions</p>
              </div>
              <div className="text-center">
                {weeklyStats?.percentageChange !== null ? (
                  <>
                    <div className="flex items-center justify-center gap-1">
                      {weeklyStats.percentageChange >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-2xl font-bold ${
                        weeklyStats.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {weeklyStats.percentageChange >= 0 ? '+' : ''}{weeklyStats.percentageChange}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">vs semaine dernière</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-muted-foreground">-</span>
                    <p className="text-xs text-muted-foreground mt-1">vs semaine dernière</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showInsuranceAlert ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">
                    Assurance professionnelle
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {daysUntilExpiry === 0 
                      ? "Votre assurance expire aujourd'hui !"
                      : daysUntilExpiry === 1
                        ? "Votre assurance expire demain !"
                        : `Votre assurance expire dans ${daysUntilExpiry} jours`
                    }
                  </p>
                  {insuranceExpiryDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Date d'expiration : {format(insuranceExpiryDate, 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
                <Badge variant="destructive" className="shrink-0">
                  Urgent
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  Aucune alerte pour le moment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TechnicianStatsPage;
