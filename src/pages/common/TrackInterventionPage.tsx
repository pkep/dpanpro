import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatusTimeline } from '@/components/interventions/StatusTimeline';
import { ClientTrackingMap } from '@/components/map/ClientTrackingMap';
import { StripeCardForm } from '@/components/payment/StripeCardForm';
import { paymentService } from '@/services/payment/payment.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Home,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Search,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

interface Intervention {
  id: string;
  tracking_code: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  address: string;
  city: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  client_email: string | null;
  client_phone: string | null;
  technician_id: string | null;
  created_at: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_price: number | null;
  final_price: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Demande reçue',
  pending: 'En attente',
  assigned: 'Technicien assigné',
  on_route: 'Technicien en route',
  in_progress: 'Intervention en cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  pending: 'bg-yellow-500',
  assigned: 'bg-purple-500',
  on_route: 'bg-orange-500',
  in_progress: 'bg-primary',
  completed: 'bg-green-500',
  cancelled: 'bg-destructive',
};

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

const CATEGORY_ICONS: Record<string, string> = {
  locksmith: '🔑',
  plumbing: '🔧',
  electricity: '⚡',
  glazing: '🪟',
  heating: '🔥',
  aircon: '❄️',
};

export default function TrackInterventionPage() {
  const { tracking_code } = useParams<{ tracking_code: string }>();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment (late authorization) state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentTotal, setPaymentTotal] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAuthorizationId, setPaymentAuthorizationId] = useState<string | null>(null);
  const [paymentAuthorized, setPaymentAuthorized] = useState(false);

  useEffect(() => {
    if (!tracking_code) {
      setError('Code de suivi manquant');
      setLoading(false);
      return;
    }

    const fetchIntervention = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('interventions')
          .select('*')
          .eq('tracking_code', tracking_code.toUpperCase())
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Intervention non trouvée. Vérifiez votre code de suivi.');
          return;
        }

        setIntervention(data);
      } catch (err) {
        console.error('Error fetching intervention:', err);
        setError('Erreur lors de la récupération des informations');
      } finally {
        setLoading(false);
      }
    };

    fetchIntervention();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`track-intervention-${tracking_code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interventions',
          filter: `tracking_code=eq.${tracking_code.toUpperCase()}`,
        },
        (payload) => {
          setIntervention(payload.new as Intervention);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tracking_code]);

  // Load payment context (quote total + last authorization status)
  useEffect(() => {
    if (!intervention?.id) return;

    const loadPayment = async () => {
      try {
        setPaymentLoading(true);

        const [quotesRes, modsRes, statusRes] = await Promise.all([
          supabase
            .from('intervention_quotes')
            .select('calculated_price')
            .eq('intervention_id', intervention.id),
          supabase
            .from('quote_modifications')
            .select('total_additional_amount')
            .eq('intervention_id', intervention.id)
            .eq('status', 'approved'),
          supabase.functions.invoke('payment-authorization-status', {
            body: { trackingCode: tracking_code?.toUpperCase() },
          }),
        ]);

        if (quotesRes.error) throw quotesRes.error;
        if (modsRes.error) throw modsRes.error;

        const statusError = (statusRes as any)?.error;
        if (statusError) throw statusError;

        const baseTotal = (quotesRes.data || []).reduce(
          (sum, l) => sum + Number(l.calculated_price || 0),
          0
        );
        const additionalTotal = (modsRes.data || []).reduce(
          (sum, m) => sum + Number(m.total_additional_amount || 0),
          0
        );
        const total = baseTotal + additionalTotal;
        setPaymentTotal(total);

        const payload = (statusRes as any)?.data;
        const lastStatus = payload?.authorization?.status ?? null;
        const isAuthorized = Boolean(payload?.authorized);

        setPaymentStatus(lastStatus);
        setPaymentAuthorized(isAuthorized);
        setPaymentAuthorizationId(payload?.authorization?.id ?? null);
      } catch (err) {
        console.error('Error loading payment context:', err);
      } finally {
        setPaymentLoading(false);
      }
    };

    loadPayment();
  }, [intervention?.id, tracking_code]);

  const canAuthorizePayment = useMemo(() => {
    if (!intervention) return false;
    if (!['assigned', 'on_route', 'in_progress'].includes(intervention.status)) return false;
    if (!intervention.client_email) return false;
    if (!paymentTotal || paymentTotal <= 0) return false;
    return true;
  }, [intervention, paymentTotal]);

  const handleStartAuthorization = async () => {
    if (!intervention) return;
    if (!canAuthorizePayment) return;

    try {
      setPaymentLoading(true);
      setPaymentClientSecret(null);

      const { id, clientSecret } = await paymentService.createPaymentIntent({
        interventionId: intervention.id,
        amount: paymentTotal!,
        clientEmail: intervention.client_email!,
        clientPhone: intervention.client_phone || undefined,
      });

      setPaymentAuthorizationId(id);
      setPaymentClientSecret(clientSecret);
    } catch (err) {
      console.error('Error starting payment authorization:', err);
      toast.error("Impossible d'initialiser le paiement", {
        description: "Veuillez réessayer dans quelques instants.",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAuthorizationSuccess = async () => {
    try {
      if (paymentAuthorizationId) {
        await paymentService.updateAuthorizationStatus(paymentAuthorizationId, 'authorized');
      }
      setPaymentAuthorized(true);
      setPaymentStatus('authorized');
      toast.success('Carte autorisée', {
        description: 'Vous pouvez maintenant finaliser l’intervention avec le technicien.',
      });
    } catch (err) {
      console.error('Error updating authorization status:', err);
      toast.error('Autorisation confirmée, mais enregistrement impossible');
    }
  };

  const handleAuthorizationError = (message: string) => {
    toast.error('Erreur de paiement', { description: message });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !intervention) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Intervention non trouvée</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'Vérifiez que votre code de suivi est correct.'}
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Code recherché : <span className="font-mono font-bold">{tracking_code}</span>
              </p>
              <Link to="/">
                <Button variant="outline" className="mt-4">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = ['assigned', 'on_route', 'in_progress'].includes(intervention.status);
  const isCompleted = intervention.status === 'completed';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <span className="font-semibold">Suivi d'intervention</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {intervention.tracking_code}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl sm:text-3xl shrink-0">
                  {CATEGORY_ICONS[intervention.category] || '🔧'}
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">
                    {CATEGORY_LABELS[intervention.category] || intervention.category}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {format(new Date(intervention.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
              <Badge className={`${STATUS_COLORS[intervention.status]} text-white shrink-0 self-start`}>
                {STATUS_LABELS[intervention.status] || intervention.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {intervention.description && (
              <p className="text-sm text-muted-foreground mb-4">
                {intervention.description}
              </p>
            )}
            
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                {intervention.address}, {intervention.postal_code} {intervention.city}
              </span>
            </div>

            {intervention.estimated_price && !isCompleted && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Prix estimé</p>
                <p className="text-xl font-bold">{intervention.estimated_price.toFixed(2)} €</p>
              </div>
            )}

            {isCompleted && intervention.final_price && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-300">Intervention terminée</p>
                </div>
                <p className="text-xl font-bold">{intervention.final_price.toFixed(2)} €</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Suivi en temps réel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline currentStatus={intervention.status as any} />
          </CardContent>
        </Card>

        {/* Live Tracking Map - only show when technician is active */}
        {isActive && intervention.latitude && intervention.longitude && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Position du technicien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientTrackingMap
                interventionId={intervention.id}
                technicianId={intervention.technician_id}
                destinationLatitude={intervention.latitude}
                destinationLongitude={intervention.longitude}
                destinationAddress={`${intervention.address}, ${intervention.postal_code} ${intervention.city}`}
                interventionStatus={intervention.status}
                height="300px"
              />
            </CardContent>
          </Card>
        )}

        {/* Payment Authorization (fallback) */}
        {isActive && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Autorisation de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!intervention.client_email ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Vos coordonnées email sont manquantes : impossible d'autoriser le paiement.
                  </AlertDescription>
                </Alert>
              ) : paymentAuthorized ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Votre carte est autorisée. Le technicien pourra débiter le montant à la fin de l'intervention.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Une autorisation de paiement est requise pour permettre la finalisation.
                      {typeof paymentTotal === 'number' && (
                        <> Montant à autoriser : <strong>{paymentTotal.toFixed(2)} €</strong>.</>
                      )}
                    </AlertDescription>
                  </Alert>

                  {!paymentClientSecret ? (
                    <Button
                      onClick={handleStartAuthorization}
                      disabled={paymentLoading || !canAuthorizePayment}
                      className="w-full"
                    >
                      {paymentLoading ? 'Préparation…' : 'Autoriser ma carte maintenant'}
                    </Button>
                  ) : (
                    <StripeCardForm
                      clientSecret={paymentClientSecret}
                      amount={paymentTotal || 0}
                      onSuccess={handleAuthorizationSuccess}
                      onError={handleAuthorizationError}
                    />
                  )}

                  {paymentStatus === 'pending' && (
                    <p className="text-xs text-muted-foreground">
                      Une autorisation précédente est en attente. Vous pouvez autoriser à nouveau si nécessaire.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        {(intervention.client_email || intervention.client_phone) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vos coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {intervention.client_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{intervention.client_email}</span>
                </div>
              )}
              {intervention.client_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{intervention.client_phone}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Vous recevrez des notifications à ces coordonnées.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Help text */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Cette page se met à jour automatiquement.</p>
          <p>Conservez votre code de suivi : <span className="font-mono font-bold">{intervention.tracking_code}</span></p>
        </div>

        <div className="text-center pb-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
