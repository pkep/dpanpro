import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';

// Stripe publishable key - PUBLIC key (safe in frontend).
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SrfsTDTC56CKPNhIxV93gHYHDinqpxPYcNurSkhUzKwjXkaOWFxdP3khzuvaBH507yahYxrA7KtsQLOBOyChXbH005j402hQH';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function PaymentForm({ clientSecret, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [paymentElementError, setPaymentElementError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    const params = new URLSearchParams(window.location.search);
    const redirectStatus = params.get('redirect_status');
    const returnedClientSecret = params.get('payment_intent_client_secret');

    if (!redirectStatus || !returnedClientSecret) return;

    stripe
      .retrievePaymentIntent(returnedClientSecret)
      .then(({ paymentIntent }) => {
        if (!paymentIntent) return;
        if (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded') {
          onSuccess();
        } else if (paymentIntent.status === 'requires_payment_method') {
          const msg = "Autorisation refusée ou expirée. Veuillez réessayer avec une autre carte.";
          setErrorMessage(msg);
          onError(msg);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la vérification du paiement';
        setErrorMessage(msg);
        onError(msg);
      })
      .finally(() => {
        params.delete('payment_intent_client_secret');
        params.delete('payment_intent');
        params.delete('redirect_status');
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
      });
  }, [stripe, onSuccess, onError]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !paymentElementReady || paymentElementError || !paymentComplete) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Une erreur est survenue');
        onError(error.message || 'Une erreur est survenue');
      } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inattendue';
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* CSS to hide Stripe's optional billing fields (email, phone, name) */}
      <style>{`
        #stripe-payment-element-wrapper .p-LinkAuthenticationElement,
        #stripe-payment-element-wrapper [class*="LinkAuthenticationElement"],
        #stripe-payment-element-wrapper .StripeElement--link,
        #stripe-payment-element-wrapper .p-BillingDetails,
        #stripe-payment-element-wrapper [class*="billingDetails"],
        #stripe-payment-element-wrapper [class*="BillingDetails"] {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <div id="stripe-payment-element-wrapper">
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: 'never',
            },
            wallets: {
              applePay: 'never',
              googlePay: 'never',
            },
          }}
          onReady={() => {
            setPaymentElementReady(true);
            setPaymentElementError(null);
          }}
          onLoadError={(event: { error?: { message?: string } }) => {
            const rawMessage = event.error?.message || 'Erreur de chargement du formulaire de paiement.';
            const message = rawMessage.includes('client_secret provided does not match any associated PaymentIntent')
              ? 'Configuration Stripe invalide : la clé publique ne correspond pas au compte de paiement configuré.'
              : rawMessage;

            setPaymentElementReady(false);
            setPaymentElementError(message);
            setErrorMessage(message);
            onError(message);
          }}
          onChange={(event) => {
            setPaymentComplete(event.complete);
          }}
        />
      </div>
      
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing || !paymentElementReady || !!paymentElementError || !paymentComplete}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Autorisation en cours...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Autoriser {formatPrice(amount)}
          </>
        )}
      </Button>
    </form>
  );
}

interface StripeCardFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripeCardForm({ clientSecret, amount, onSuccess, onError }: StripeCardFormProps) {
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      setStripeError('Clé publique Stripe non configurée.');
      return;
    }

    const stripe = getStripe();
    if (stripe) {
      stripe.then((s) => {
        if (s) {
          setStripeReady(true);
        } else {
          setStripeError('Impossible de charger Stripe.');
        }
      }).catch((err) => {
        setStripeError(`Erreur Stripe: ${err.message}`);
      });
    }
  }, []);

  if (stripeError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{stripeError}</AlertDescription>
      </Alert>
    );
  }

  if (!stripeReady) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement du formulaire de paiement...</span>
      </div>
    );
  }

  const stripe = getStripe();

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: 'hsl(221.2, 83.2%, 53.3%)',
            borderRadius: '8px',
          },
        },
        locale: 'fr',
      }}
    >
      <PaymentForm
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
