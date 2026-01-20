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

// Stripe publishable key - this is a PUBLIC key, safe to include in frontend code
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SrfsTDTC56CKPNhIxV93gHYHDinqpxPYcNurSkhUzKwjXkaOWFxdP3khzuvaBH507yahYxrA7KtsQLOBOyChXbH005j402hQH';

// Initialize Stripe
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
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
        // Authorization successful - funds are held but not captured
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Shouldn't happen with manual capture, but handle anyway
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
      <PaymentElement 
        options={{
          layout: 'tabs',
        }}
      />
      
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
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
      setStripeError('Clé Stripe non configurée. Veuillez contacter le support.');
      return;
    }

    const stripe = getStripe();
    if (stripe) {
      stripe.then((s) => {
        if (s) {
          setStripeReady(true);
        } else {
          setStripeError('Impossible de charger Stripe. Vérifiez la clé publique.');
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
