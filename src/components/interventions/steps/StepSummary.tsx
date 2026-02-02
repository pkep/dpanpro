import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CATEGORY_LABELS, InterventionCategory } from '@/types/intervention.types';
import { CheckCircle2, Copy, MapPin, Mail, Phone, FileText, Image, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QuoteInput } from '@/services/quotes/quotes.service';
import { NextStepsCard } from './NextStepsCard';
import { NearbyTechniciansCard } from './NearbyTechniciansCard';
interface StepSummaryProps {
  category: InterventionCategory;
  description: string;
  address: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  photos: string[];
  trackingCode?: string;
  isSubmitted?: boolean;
  quoteLines?: QuoteInput[];
  totalHT?: number;
  vatRate?: number;
  vatAmount?: number;
  totalTTC?: number;
  isPaymentAuthorized?: boolean;
}

export function StepSummary({
  category,
  description,
  address,
  postalCode,
  city,
  email,
  phone,
  photos,
  trackingCode,
  isSubmitted = false,
  quoteLines = [],
  totalHT = 0,
  vatRate = 10,
  vatAmount = 0,
  totalTTC = 0,
  isPaymentAuthorized = false,
}: StepSummaryProps) {
  const copyTrackingCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast.success('Code de suivi copié !');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  if (isSubmitted && trackingCode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
              Demande envoyée !
            </h2>
            <p className="text-muted-foreground mt-2">
              Votre demande d'intervention a été enregistrée avec succès
            </p>
          </div>

          <Card className="bg-primary/5 border-primary/20 mt-6">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">
                Votre code de suivi
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-wider">
                  {trackingCode}
                </span>
                <Button variant="ghost" size="icon" onClick={copyTrackingCode}>
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Conservez ce code pour suivre l'avancement de votre intervention
              </p>
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground mt-4">
            <p>Un email de confirmation a été envoyé à <strong>{email}</strong></p>
            <p className="mt-1">Un technicien vous contactera rapidement au <strong>{phone}</strong></p>
          </div>
        </div>

        {/* Next Steps Card */}
        <NextStepsCard />

        {/* Nearby Technicians Card */}
        <NearbyTechniciansCard 
          address={address}
          postalCode={postalCode}
          city={city}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">5. Récapitulatif</h2>
        <p className="text-muted-foreground mt-2">
          Vérifiez les informations avant de valider
        </p>
      </div>

      <div className="space-y-4">
        {/* Service */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type d'intervention</span>
              <Badge variant="secondary">{CATEGORY_LABELS[category]}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">Description</span>
                <p className="mt-1">{description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        {photos.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Image className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">
                    {photos.length} photo(s) jointe(s)
                  </span>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">Adresse d'intervention</span>
                <p className="mt-1">{address}</p>
                <p>{postalCode} {city}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p>{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <p>{phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Authorization Summary */}
        {isPaymentAuthorized && quoteLines.length > 0 && (
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400">Autorisation de paiement confirmée</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quoteLines.map((line, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span>{formatPrice(line.basePrice * line.multiplier)}</span>
                </div>
              ))}
              
              <Separator />
              
              {/* Total HT */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatPrice(totalHT)}</span>
              </div>
              
              {/* TVA */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">TVA ({vatRate}%)</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="font-semibold">Montant TTC autorisé</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatPrice(totalTTC)}
                </span>
              </div>

              <Alert className="mt-4 bg-white/50 dark:bg-background/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Le paiement sera effectué qu'à la fin de l'intervention.</strong>
                  <br />
                  Les fonds sont bloqués en garantie et seront prélevés uniquement après validation du service.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
