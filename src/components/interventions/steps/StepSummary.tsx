import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CATEGORY_LABELS, InterventionCategory } from '@/types/intervention.types';
import { CheckCircle2, Copy, MapPin, Mail, Phone, FileText, Image, Info, Clock, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NextStepsCard } from './NextStepsCard';
import { NearbyTechniciansCard } from './NearbyTechniciansCard';
import type { QuestionnaireResult } from '@/data/questionnaire-tree';
import { cn } from '@/lib/utils';

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
  questionnaireResult?: QuestionnaireResult | null;
  questionnaireAnswers?: string[];
}

const TIER_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  mid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  xhigh: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

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
  questionnaireResult,
  questionnaireAnswers = [],
}: StepSummaryProps) {
  const copyTrackingCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast.success('Code de suivi copié !');
    }
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
              <p className="text-sm text-muted-foreground mb-2">Votre code de suivi</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-wider">{trackingCode}</span>
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

        <NextStepsCard />
        <NearbyTechniciansCard address={address} postalCode={postalCode} city={city} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Récapitulatif</h2>
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

        {/* Questionnaire Result */}
        {questionnaireResult && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prestation identifiée</p>
                  <p className="font-semibold mt-1">{questionnaireResult.nom}</p>
                  <p className="text-sm text-muted-foreground mt-1">{questionnaireResult.desc}</p>
                </div>
              </div>
              
              {/* Price range */}
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold', TIER_COLORS[questionnaireResult.tier])}>
                {questionnaireResult.prix} <span className="text-sm font-normal">TTC</span>
              </div>

              {/* Parcours */}
              {questionnaireAnswers.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  {questionnaireAnswers.map((a, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span>›</span>}
                      <span>{a}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Meta */}
              {questionnaireResult.meta && (
                <div className="flex flex-wrap gap-2">
                  {questionnaireResult.meta.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {m.includes('Urgence') && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {m.includes('Garantie') && <Shield className="h-3 w-3 mr-1" />}
                      {(m.includes('min') || m.includes('h') || m.includes('journée')) && <Clock className="h-3 w-3 mr-1" />}
                      {m}
                    </Badge>
                  ))}
                </div>
              )}

              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ce prix est indicatif. Le technicien vous fournira un devis définitif avant de commencer l'intervention. Le paiement sera demandé à ce moment-là.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {description && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-sm text-muted-foreground">Informations complémentaires</span>
                  <p className="mt-1">{description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Image className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground">{photos.length} photo(s) jointe(s)</span>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {photos.map((photo, index) => (
                      <img key={index} src={photo} alt={`Photo ${index + 1}`} className="w-full aspect-square object-cover rounded" />
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

        {/* Cancellation notice */}
        <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-700 dark:text-amber-400">En cas d'annulation :</strong>
            <br />
            Si le technicien est arrivé sur le lieu ou est en route à moins de 5 minutes du lieu de l'intervention, les frais de déplacement seront automatiquement prélevés.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
