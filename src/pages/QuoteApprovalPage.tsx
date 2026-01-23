import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quoteModificationsService, QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
import { quotesService, QuoteLine } from '@/services/quotes/quotes.service';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  Wrench, 
  HelpCircle,
  Home,
  AlertCircle,
  Euro,
  FileText,
  ArrowLeft,
  Truck,
  Shield,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import logoImage from '@/assets/logo.png';

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  service: <Wrench className="h-4 w-4" />,
  equipment: <Package className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  service: 'Service',
  equipment: 'Équipement',
  other: 'Autre',
};

const LINE_TYPE_ICONS: Record<string, React.ReactNode> = {
  displacement: <Truck className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  repair: <Settings className="h-4 w-4" />,
};

const LINE_TYPE_LABELS: Record<string, string> = {
  displacement: 'Déplacement',
  security: 'Mise en sécurité',
  repair: 'Dépannage',
};

interface InterventionInfo {
  id: string;
  title: string;
  address: string;
  city: string;
  postalCode: string;
  category: string;
  trackingCode: string | null;
}

export default function QuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [modification, setModification] = useState<QuoteModification | null>(null);
  const [intervention, setIntervention] = useState<InterventionInfo | null>(null);
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Token invalide');
        setLoading(false);
        return;
      }

      try {
        const mod = await quoteModificationsService.getModificationByToken(token);
        
        if (!mod) {
          setError('Demande de modification non trouvée ou lien expiré');
          setLoading(false);
          return;
        }

        setModification(mod);

        // Fetch intervention details
        const { data: intData } = await supabase
          .from('interventions')
          .select('id, title, address, city, postal_code, category, tracking_code')
          .eq('id', mod.interventionId)
          .single();

        if (intData) {
          setIntervention({
            id: intData.id,
            title: intData.title,
            address: intData.address,
            city: intData.city,
            postalCode: intData.postal_code,
            category: intData.category,
            trackingCode: intData.tracking_code,
          });

          // Fetch initial quote lines
          const lines = await quotesService.getQuoteLines(mod.interventionId);
          setQuoteLines(lines);
        }
      } catch (err) {
        console.error('Error fetching modification:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleApprove = async () => {
    if (!modification) return;
    
    setProcessing(true);
    try {
      await quoteModificationsService.approveModification(modification.id);
      setModification({ ...modification, status: 'approved' });
      toast.success('Modification approuvée !');
    } catch (err) {
      console.error('Error approving:', err);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!modification) return;
    
    setProcessing(true);
    try {
      await quoteModificationsService.declineModification(modification.id);
      setModification({ ...modification, status: 'declined' });
      toast.success('Modification refusée');
    } catch (err) {
      console.error('Error declining:', err);
      toast.error('Erreur lors du refus');
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Calculate totals
  const initialTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
  const additionalTotal = modification?.totalAdditionalAmount || 0;
  const grandTotal = initialTotal + additionalTotal;

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-16 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !modification) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <img src={logoImage} alt="Logo" className="h-12 mx-auto mb-4" />
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error || 'Demande non trouvée'}</AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button asChild variant="outline">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPending = modification.status === 'pending';
  const isApproved = modification.status === 'approved';
  const isDeclined = modification.status === 'declined';

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <img src={logoImage} alt="Logo" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Modification de devis</h1>
          <p className="text-muted-foreground mt-1">
            Validez ou refusez les travaux supplémentaires
          </p>
        </div>


        {/* Status Banner */}
        {!isPending && (
          <Alert variant={isApproved ? 'default' : 'destructive'} className={isApproved ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
            {isApproved ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {isApproved ? 'Modification approuvée' : 'Modification refusée'}
            </AlertTitle>
            <AlertDescription>
              {isApproved 
                ? 'Vous avez approuvé ces travaux supplémentaires. Le technicien peut maintenant les réaliser.'
                : 'Vous avez refusé ces travaux supplémentaires. Le technicien finalisera l\'intervention avec le devis initial.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Intervention Info */}
        {intervention && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Intervention concernée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{intervention.title}</p>
              <p className="text-sm text-muted-foreground">
                {intervention.address}, {intervention.postalCode} {intervention.city}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Initial Quote Lines */}
        {quoteLines.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Devis initial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quoteLines.map((line) => (
                <div key={line.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {LINE_TYPE_ICONS[line.lineType] || <Wrench className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{line.label}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {LINE_TYPE_LABELS[line.lineType] || line.lineType}
                      </Badge>
                    </div>
                  </div>
                  <p className="font-semibold">{formatPrice(line.calculatedPrice)}</p>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="font-medium">Sous-total devis initial</span>
                <span className="font-bold">{formatPrice(initialTotal)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modification Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Travaux supplémentaires</CardTitle>
              <Badge variant={isPending ? 'secondary' : isApproved ? 'default' : 'destructive'}>
                {isPending && <Clock className="h-3 w-3 mr-1" />}
                {isApproved && <CheckCircle className="h-3 w-3 mr-1" />}
                {isDeclined && <XCircle className="h-3 w-3 mr-1" />}
                {isPending ? 'En attente' : isApproved ? 'Approuvé' : 'Refusé'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Demandé le {format(new Date(modification.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items List */}
            <div className="space-y-3">
              {modification.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {ITEM_TYPE_ICONS[item.itemType]}
                    </div>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {ITEM_TYPE_LABELS[item.itemType]}
                        </Badge>
                        <span>×{item.quantity}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(item.totalPrice)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.unitPrice)} / unité
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Subtotal additional */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="font-medium">Sous-total suppléments</span>
              <span className="font-bold">{formatPrice(additionalTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Grand Total */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-primary" />
                <span className="font-semibold">Total général</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(grandTotal)}
              </span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground flex justify-between">
              <span>Devis initial : {formatPrice(initialTotal)}</span>
              <span>Suppléments : {formatPrice(additionalTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isPending && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground mb-4">
                En approuvant, vous acceptez que ces travaux soient ajoutés à votre facture finale.
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDecline}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center space-y-3">
          {!isPending && intervention && (
            <Button asChild variant="outline" className="w-full">
              <Link to={`/intervention/${intervention.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'intervention
              </Link>
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Des questions ? Contactez notre service client.
          </p>
          <Button asChild variant="link" size="sm">
            <Link to="/">
              <Home className="h-3 w-3 mr-1" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
