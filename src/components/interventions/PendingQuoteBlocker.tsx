import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quoteModificationsService, type QuoteModification } from '@/services/quote-modifications/quote-modifications.service';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, FileText, ExternalLink, Euro } from 'lucide-react';

interface PendingQuoteBlockerProps {
  interventionId: string;
  onQuoteResolved?: () => void;
}

export function PendingQuoteBlocker({ interventionId, onQuoteResolved }: PendingQuoteBlockerProps) {
  const [pendingQuote, setPendingQuote] = useState<QuoteModification | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch pending quote modification
  const fetchPendingQuote = async () => {
    try {
      const modification = await quoteModificationsService.getPendingModification(interventionId);
      setPendingQuote(modification);
    } catch (error) {
      console.error('Error fetching pending quote:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQuote();
  }, [interventionId]);

  // Subscribe to realtime changes on quote_modifications table
  useEffect(() => {
    const channel = supabase
      .channel(`quote-blocker-${interventionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_modifications',
          filter: `intervention_id=eq.${interventionId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          
          // If status changed from pending to approved/declined
          if (newData && newData.status !== 'pending') {
            setPendingQuote(null);
            onQuoteResolved?.();
          } else if (payload.eventType === 'INSERT' && newData?.status === 'pending') {
            // New pending modification created - refresh
            fetchPendingQuote();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interventionId, onQuoteResolved]);

  if (loading || !pendingQuote) {
    return null;
  }

  // BLOCKING MODAL - Cannot be dismissed
  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 mx-auto">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <AlertDialogTitle className="text-center mt-2">
            Action requise
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Le technicien a proposé des prestations supplémentaires. <strong>Vous devez valider ou refuser cette modification pour que le technicien puisse continuer l'intervention.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Quote summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Détail du devis
              </span>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                En attente
              </Badge>
            </div>
            
            <Separator />
            
            {/* Items list */}
            <div className="space-y-2">
              {pendingQuote.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.label} {item.quantity > 1 && `(x${item.quantity})`}
                  </span>
                  <span className="font-medium">{item.totalPrice.toFixed(2)} €</span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="font-semibold flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Total supplémentaire
              </span>
              <span className="font-bold text-lg">
                {pendingQuote.totalAdditionalAmount.toFixed(2)} €
              </span>
            </div>
          </div>

          {/* Warning message */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium text-center">
              ⚠️ Le technicien ne peut pas finaliser l'intervention tant que vous n'avez pas traité cette demande.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to={`/quote-approval/${pendingQuote.notificationToken}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Traiter le devis maintenant
            </Link>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
