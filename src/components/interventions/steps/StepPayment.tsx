import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Shield, Info, CheckCircle2 } from 'lucide-react';
import { QuoteInput } from '@/services/quotes/quotes.service';

interface StepPaymentProps {
  quoteLines: QuoteInput[];
  totalAmount: number;
  multiplierLabel: string;
  isProcessing: boolean;
  isAuthorized: boolean;
  onAuthorize: () => void;
}

export function StepPayment({
  quoteLines,
  totalAmount,
  multiplierLabel,
  isProcessing,
  isAuthorized,
  onAuthorize,
}: StepPaymentProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

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
            Le montant de {formatPrice(totalAmount)} a été autorisé avec succès.
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
          Niveau d'urgence : <Badge variant="secondary">{multiplierLabel}</Badge>
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
          
          <div className="flex justify-between items-center pt-2">
            <span className="font-semibold">Total estimé</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(totalAmount)}
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
                En cliquant sur le bouton ci-dessous, vous autorisez le blocage du montant sur votre carte. 
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

      {/* Authorize button */}
      <Button
        onClick={onAuthorize}
        disabled={isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirection vers le paiement...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Autoriser {formatPrice(totalAmount)}
          </>
        )}
      </Button>
    </div>
  );
}
