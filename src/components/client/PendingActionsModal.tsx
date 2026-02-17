import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  AlertTriangle,
  FileText,
  Euro,
  ExternalLink,
  Shield,
  Loader2,
} from 'lucide-react';

interface PendingPaymentAction {
  type: 'payment_authorization';
  interventionId: string;
  interventionTitle: string;
  trackingCode: string | null;
  amount: number;
  currency: string;
  authorizationId: string;
  status: string;
}

interface PendingQuoteAction {
  type: 'quote_approval';
  interventionId: string;
  interventionTitle: string;
  totalAmount: number;
  notificationToken: string;
  modificationId: string;
}

type PendingAction = PendingPaymentAction | PendingQuoteAction;

export function PendingActionsModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchPendingActions = useCallback(async () => {
    if (!user) return;

    try {
      // Get all active interventions for this client
      const { data: interventions, error: intError } = await supabase
        .from('interventions')
        .select('id, title, tracking_code')
        .eq('client_id', user.id)
        .not('status', 'in', '("completed","cancelled")');

      if (intError) throw intError;
      if (!interventions || interventions.length === 0) {
        setActions([]);
        setOpen(false);
        return;
      }

      const interventionIds = interventions.map(i => i.id);
      const allActions: PendingAction[] = [];

      // 1. Check for failed/pending payment authorizations that need client action
      const { data: paymentAuths, error: payError } = await supabase
        .from('payment_authorizations')
        .select('id, intervention_id, amount_authorized, currency, status')
        .in('intervention_id', interventionIds)
        .in('status', ['failed', 'pending']);

      if (!payError && paymentAuths) {
        for (const auth of paymentAuths) {
          const intervention = interventions.find(i => i.id === auth.intervention_id);
          if (intervention) {
            allActions.push({
              type: 'payment_authorization',
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              trackingCode: intervention.tracking_code,
              amount: auth.amount_authorized,
              currency: auth.currency,
              authorizationId: auth.id,
              status: auth.status,
            });
          }
        }
      }

      // 2. Check for pending quote modifications
      const { data: modifications, error: modError } = await supabase
        .from('quote_modifications')
        .select('id, intervention_id, total_additional_amount, notification_token')
        .in('intervention_id', interventionIds)
        .eq('status', 'pending');

      if (!modError && modifications) {
        for (const mod of modifications) {
          const intervention = interventions.find(i => i.id === mod.intervention_id);
          if (intervention) {
            allActions.push({
              type: 'quote_approval',
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              totalAmount: mod.total_additional_amount,
              notificationToken: mod.notification_token || '',
              modificationId: mod.id,
            });
          }
        }
      }

      setActions(allActions);
      setOpen(allActions.length > 0);
    } catch (error) {
      console.error('Error fetching pending actions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingActions();
  }, [fetchPendingActions]);

  // Realtime: listen for changes + polling fallback
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('client-pending-actions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_authorizations' }, () => {
        fetchPendingActions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_modifications' }, () => {
        fetchPendingActions();
      })
      .subscribe();

    // Polling fallback every 10s in case realtime fails silently
    const pollId = setInterval(() => {
      fetchPendingActions();
    }, 10000);

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [user, fetchPendingActions]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);

  const handleAction = (action: PendingAction) => {
    if (action.type === 'payment_authorization' && action.trackingCode) {
      navigate(`/track/${action.trackingCode}`);
    } else if (action.type === 'quote_approval') {
      navigate(`/quote-approval/${action.notificationToken}`);
    } else {
      navigate(`/intervention/${action.interventionId}`);
    }
    // Don't close modal - it will close automatically once the action is resolved
  };

  if (loading || actions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {/* Prevent closing */}}>
      <DialogContent
        className="sm:max-w-lg [&>button[class*='absolute']]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Action{actions.length > 1 ? 's' : ''} requise{actions.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Vous avez {actions.length} action{actions.length > 1 ? 's' : ''} en attente.
            Veuillez les traiter pour continuer à utiliser l'application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {actions.map((action, index) => (
            <div key={`${action.type}-${action.interventionId}-${index}`}>
              {index > 0 && <Separator className="my-3" />}

              {action.type === 'payment_authorization' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-destructive" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">Autorisation de paiement requise</p>
                      <p className="text-sm text-muted-foreground">{action.interventionTitle}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {formatPrice(action.amount)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {action.status === 'failed' ? 'Échouée' : 'En attente'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Votre carte doit être autorisée pour que le technicien puisse finaliser l'intervention.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAction(action)}
                    className="w-full"
                    size="sm"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Autoriser le paiement
                  </Button>
                </div>
              )}

              {action.type === 'quote_approval' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-warning" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">Devis en attente de validation</p>
                      <p className="text-sm text-muted-foreground">{action.interventionTitle}</p>
                      <Badge variant="outline" className="text-xs bg-background">
                        <Euro className="h-3 w-3 mr-1" />
                        {formatPrice(action.totalAmount)} supplémentaires
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Le technicien propose des prestations supplémentaires qui nécessitent votre approbation.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAction(action)}
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Traiter le devis
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Alert className="border-muted">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Vous ne pourrez pas accéder aux autres fonctionnalités tant que ces actions n'auront pas été traitées.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
