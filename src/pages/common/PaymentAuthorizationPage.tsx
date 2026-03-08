import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { StripeCardForm } from '@/components/payment/StripeCardForm';
import { paymentService } from '@/services/payment/payment.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MapPin,
  AlertCircle,
  CheckCircle2,
  Shield,
  Home,
  CreditCard,
  FileText,
  Euro,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

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

interface InterventionData {
  id: string;
  tracking_code: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  address: string;
  city: string;
  postal_code: string;
  client_email: string | null;
  client_phone: string | null;
  created_at: string;
}

interface QuoteLine {
  label: string;
  calculated_price: number;
  line_type: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);

export default function PaymentAuthorizationPage() {
  const { interventionId } = useParams<{ interventionId: string }>();
  const [intervention, setIntervention] = useState<InterventionData | null>(null);
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [additionalTotal, setAdditionalTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentAuthorizationId, setPaymentAuthorizationId] = useState<string | null>(null);
  const [paymentAuthorized, setPaymentAuthorized] = useState(false);

  // Fetch intervention + quote data
  useEffect(() => {
    if (!interventionId) {
      setError('Identifiant manquant');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [intRes, quotesRes, modsRes] = await Promise.all([
          supabase
            .from('interventions')
            .select('id, tracking_code, title, description, category, status, address, city, postal_code, client_email, client_phone, created_at')
            .eq('id', interventionId)
            .maybeSingle(),
          supabase
            .from('intervention_quotes')
            .select('label, calculated_price, line_type')
            .eq('intervention_id', interventionId)
            .order('display_order'),
          supabase
            .from('quote_modifications')
            .select('total_additional_amount')
            .eq('intervention_id', interventionId)
            .eq('status', 'approved'),
        ]);

        if (intRes.error) throw intRes.error;
        if (!intRes.data) {
          setError('Intervention non trouvée');
          return;
        }

        setIntervention(intRes.data);
        setQuoteLines(quotesRes.data || []);
        setAdditionalTotal(
          (modsRes.data || []).reduce((s, m) => s + Number(m.total_additional_amount || 0), 0)
        );

        // Check existing authorization status
        const authRes = await supabase
          .from('payment_authorizations')
          .select('id, status')
          .eq('intervention_id', interventionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (authRes.data) {
          setPaymentAuthorizationId(authRes.data.id);
          setPaymentStatus(authRes.data.status);
          setPaymentAuthorized(authRes.data.status === 'authorized');
        }
      } catch (err) {
        console.error('Error loading payment page:', err);
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime for authorization updates
    const channel = supabase
      .channel(`payment-auth-page-${interventionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_authorizations',
        filter: `intervention_id=eq.${interventionId}`,
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        if (newStatus) {
          setPaymentStatus(newStatus);
          setPaymentAuthorized(newStatus === 'authorized');
          setPaymentAuthorizationId(payload.new.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [interventionId]);

  const baseTotal = useMemo(
    () => quoteLines.reduce((s, l) => s + Number(l.calculated_price || 0), 0),
    [quoteLines]
  );
  const grandTotal = baseTotal + additionalTotal;

  const canAuthorize = useMemo(() => {
    if (!intervention) return false;
    if (!intervention.client_email) return false;
    if (grandTotal <= 0) return false;
    return true;
  }, [intervention, grandTotal]);

  const handleStartAuthorization = async () => {
    if (!intervention || !canAuthorize) return;
    try {
      setPaymentLoading(true);
      setPaymentClientSecret(null);
      const { id, clientSecret } = await paymentService.createPaymentIntent({
        interventionId: intervention.id,
        amount: grandTotal,
        clientEmail: intervention.client_email!,
        clientPhone: intervention.client_phone || undefined,
      });
      setPaymentAuthorizationId(id);
      setPaymentClientSecret(clientSecret);
    } catch (err) {
      console.error('Error starting payment:', err);
      toast.error("Impossible d'initialiser le paiement");
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
      toast.success('Carte autorisée avec succès !', {
        description: 'Le technicien peut désormais finaliser l\'intervention.',
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAuthorizationError = (message: string) => {
    toast.error('Erreur de paiement', { description: message });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-4 pt-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
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
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-4">{error || 'Intervention non trouvée'}</p>
            <Link to="/">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Autorisation de paiement</span>
          </div>
          {intervention.tracking_code && (
            <Badge variant="secondary" className="font-mono text-xs">
              {intervention.tracking_code}
            </Badge>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Intervention recap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-3">
              <span className="text-2xl">
                {CATEGORY_ICONS[intervention.category] || '🔧'}
              </span>
              <div>
                <p className="font-semibold">
                  {CATEGORY_LABELS[intervention.category] || intervention.category}
                </p>
                <p className="text-sm font-normal text-muted-foreground">{intervention.title}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {intervention.description && (
              <p className="text-sm text-muted-foreground">{intervention.description}</p>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>{intervention.address}, {intervention.postal_code} {intervention.city}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Créée le {format(new Date(intervention.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          </CardContent>
        </Card>

        {/* Quote details */}
        {quoteLines.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Détail du devis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quoteLines.map((line, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="font-medium">{formatPrice(line.calculated_price)}</span>
                </div>
              ))}

              {additionalTotal > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prestations supplémentaires</span>
                    <span className="font-medium">{formatPrice(additionalTotal)}</span>
                  </div>
                </>
              )}

              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total à autoriser</span>
                <span className="text-lg">{formatPrice(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiement sécurisé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentAuthorized ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Votre carte a été autorisée avec succès. Le technicien peut désormais finaliser l'intervention.
                  Vous ne serez débité qu'à la fin de la prestation.
                </AlertDescription>
              </Alert>
            ) : !intervention.client_email ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Email manquant — impossible d'autoriser le paiement.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Aucun montant ne sera débité maintenant. Votre carte sera uniquement <strong>pré-autorisée</strong> pour
                    garantir le paiement à la fin de l'intervention.
                  </AlertDescription>
                </Alert>

                {!paymentClientSecret ? (
                  <Button
                    onClick={handleStartAuthorization}
                    disabled={paymentLoading || !canAuthorize}
                    className="w-full"
                    size="lg"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Préparation…
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Autoriser {formatPrice(grandTotal)}
                      </>
                    )}
                  </Button>
                ) : (
                  <StripeCardForm
                    clientSecret={paymentClientSecret}
                    amount={grandTotal}
                    onSuccess={handleAuthorizationSuccess}
                    onError={handleAuthorizationError}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-xs text-center text-muted-foreground pb-4">
          Paiement sécurisé par Stripe. Vos données bancaires ne sont jamais stockées sur nos serveurs.
        </p>
      </main>
    </div>
  );
}
