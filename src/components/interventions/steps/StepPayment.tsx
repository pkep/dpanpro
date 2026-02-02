import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Shield, Info, CheckCircle2 } from 'lucide-react';
import { QuoteInput } from '@/services/quotes/quotes.service';
import { StripeCardForm } from '@/components/payment/StripeCardForm';

interface StepPaymentProps {
  quoteLines: QuoteInput[];
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  multiplierLabel: string;
  isProcessing: boolean;
  isAuthorized: boolean;
  clientSecret: string | null;
  onInitializePayment: () => void;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export function StepPayment({
  quoteLines,
  totalHT,
  vatRate,
  vatAmount,
  totalTTC,
  multiplierLabel,
  isProcessing,
  isAuthorized,
  clientSecret,
  onInitializePayment,
  onPaymentSuccess,
  onPaymentError,
}: StepPaymentProps) {
  const [initialized, setInitialized] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  // Initialize payment when component mounts (if not already done)
  useEffect(() => {
    if (!initialized && !clientSecret && !isAuthorized && totalTTC > 0) {
      setInitialized(true);
      onInitializePayment();
    }
  }, [initialized, clientSecret, isAuthorized, totalTTC, onInitializePayment]);

  if (isAuthorized) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Autorisation confirmée
          </h3>
          <p className="text-muted-foreground">
            Le montant de {formatPrice(totalTTC)} a été autorisé avec succès.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Le paiement sera effectué qu'à la fin de l'intervention.</strong>
            <br />
            Les fonds sont simplement bloqués en garantie et seront prélevés uniquement après validation du service.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Devis estimatif</h3>
        <p className="text-sm text-muted-foreground">
          Niveau d'urgence : <Badge variant="secondary" className="ml-1">{multiplierLabel}</Badge>
        </p>
      </div>

      {/* Quote breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Service de base (Devis)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quoteLines.map((line, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{line.label}</span>
              <span className="font-medium">
                {formatPrice(line.basePrice * line.multiplier)}
              </span>
            </div>
          ))}
          
          <Separator />
          
          {/* Total HT */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total HT</span>
            <span className="font-medium">{formatPrice(totalHT)}</span>
          </div>
          
          {/* TVA */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">TVA ({vatRate}%)</span>
            <span className="font-medium">{formatPrice(vatAmount)}</span>
          </div>
          
          <Separator />
          
          {/* Total TTC */}
          <div className="flex justify-between items-center pt-2">
            <span className="font-semibold">Total TTC</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(totalTTC)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Additional fees notice */}
      <Alert variant="default" className="bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Des frais éventuels peuvent s'ajouter si le technicien doit ajouter une prestation non comprise dans le service de base.
          <br />
          <span className="font-medium">98% des interventions ne nécessitent aucune prestation ou équipement additionnel 😊</span>
        </AlertDescription>
      </Alert>

      {/* Authorization explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Autorisation de paiement sécurisée</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Entrez vos informations de carte ci-dessous. 
                <strong className="text-foreground"> Le paiement réel sera effectué qu'à la fin de l'intervention.</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Fonds bloqués en garantie uniquement</li>
                <li>✓ Paiement prélevé après validation du service</li>
                <li>✓ Annulation possible avant l'intervention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Card Form */}
      {isProcessing && !clientSecret && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Préparation du formulaire de paiement...</span>
        </div>
      )}

      {clientSecret && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Informations de paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StripeCardForm
              clientSecret={clientSecret}
              amount={totalTTC}
              onSuccess={onPaymentSuccess}
              onError={onPaymentError}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
