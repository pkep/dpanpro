import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { interventionsService } from '@/services/interventions/interventions.service';
import { quotesService } from '@/services/quotes/quotes.service';
import { quoteModificationsService } from '@/services/quote-modifications/quote-modifications.service';
import { paymentService } from '@/services/payment/payment.service';
import { historyService } from '@/services/history/history.service';
import { invoiceService } from '@/services/invoice/invoice.service';
import { useAuth } from '@/hooks/useAuth';
import type { Intervention } from '@/types/intervention.types';

interface FinalizeInterventionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intervention: Intervention;
  onFinalized: () => void;
}

export function FinalizeInterventionDialog({
  open,
  onOpenChange,
  intervention,
  onFinalized,
}: FinalizeInterventionDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [baseQuoteTotal, setBaseQuoteTotal] = useState(0);
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [hasPendingModification, setHasPendingModification] = useState(false);
  const [hasDeclinedModification, setHasDeclinedModification] = useState(false);

  useEffect(() => {
    if (open) {
      loadQuoteData();
    }
  }, [open, intervention.id]);

  const loadQuoteData = async () => {
    setIsLoading(true);
    try {
      // Get base quote
      const quoteLines = await quotesService.getQuoteLines(intervention.id);
      const baseTotal = quoteLines.reduce((sum, line) => sum + line.calculatedPrice, 0);
      setBaseQuoteTotal(baseTotal);

      // Get approved modifications
      const modifications = await quoteModificationsService.getModificationsByIntervention(intervention.id);
      const pendingMod = modifications.find((m) => m.status === 'pending');
      const declinedMod = modifications.find((m) => m.status === 'declined');
      const approvedMods = modifications.filter((m) => m.status === 'approved');
      
      setHasPendingModification(!!pendingMod);
      setHasDeclinedModification(!!declinedMod && !approvedMods.length);

      const additionalTotal = approvedMods.reduce(
        (sum, mod) => sum + mod.totalAdditionalAmount,
        0
      );
      setAdditionalAmount(additionalTotal);
    } catch (err) {
      console.error('Error loading quote data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const finalAmount = baseQuoteTotal + additionalAmount;

      // Capture the payment
      const { error: captureError } = await supabase.functions.invoke('capture-payment', {
        body: {
          interventionId: intervention.id,
          amount: Math.round(finalAmount * 100), // Convert to cents
        },
      });

      if (captureError) {
        const msg = captureError.message || '';
        // Check if client was notified
        const clientNotified = msg.includes('notification has been sent') || msg.includes('A notification has been sent');
        const notificationNote = clientNotified 
          ? "\n\n✅ Le client a été notifié par SMS pour autoriser sa carte."
          : "";
        
        if (msg.includes('requires_payment_method') || msg.includes('Payment not authorized')) {
          throw new Error(
            `Paiement impossible : aucune autorisation carte valide n'est disponible. Le client doit autoriser (ou ré-autoriser) sa carte avant la finalisation.${notificationNote}`
          );
        }
        if (msg.includes('requires_action')) {
          throw new Error(
            `Paiement impossible : authentification bancaire requise. Le client doit finaliser l'autorisation de paiement.${notificationNote}`
          );
        }
        throw new Error(msg || 'Erreur lors du débit de la carte');
      }

      // Update intervention status
      await interventionsService.updateStatus(intervention.id, 'completed');

      // Update final price
      await supabase
        .from('interventions')
        .update({ final_price: finalAmount } as Record<string, unknown>)
        .eq('id', intervention.id);

      // Add history entry for finalization
      await historyService.addHistoryEntry({
        interventionId: intervention.id,
        userId: user.id,
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'completed',
        comment: `Intervention finalisée. Montant débité : ${finalAmount.toFixed(2)} €`,
      });

      // Generate and download invoice PDF + send by email
      try {
        // Download locally
        await invoiceService.generateAndDownloadInvoice(intervention);
        
        // Send by email to client
        const emailSent = await invoiceService.sendInvoiceByEmail(intervention);
        
        if (emailSent) {
          toast.success('Intervention finalisée !', {
            description: 'Facture téléchargée et envoyée par email au client.',
          });
        } else {
          toast.success('Intervention finalisée ! Facture téléchargée.', {
            description: 'L\'envoi par email n\'a pas pu être effectué.',
          });
        }
      } catch (invoiceErr) {
        console.error('Error generating invoice:', invoiceErr);
        toast.success('Intervention finalisée !', {
          description: 'La facture n\'a pas pu être générée automatiquement.',
        });
      }

      // Trigger the rating dialog via parent callback
      onOpenChange(false);
      onFinalized();
    } catch (err) {
      console.error('Error finalizing intervention:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de la finalisation';
      toast.error('Erreur lors de la finalisation', { description: message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      await invoiceService.generateAndDownloadInvoice(intervention);
      toast.success('Facture téléchargée');
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleAbandon = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      // Cancel the payment authorization
      const { error: cancelError } = await supabase.functions.invoke('cancel-payment', {
        body: { interventionId: intervention.id },
      });

      if (cancelError) {
        console.error('Error cancelling payment:', cancelError);
      }

      // Update intervention status
      await interventionsService.updateStatus(intervention.id, 'cancelled');

      // Add history entry for cancellation
      await historyService.addHistoryEntry({
        interventionId: intervention.id,
        userId: user.id,
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'cancelled',
        comment: 'Intervention abandonnée - le client a refusé les prestations supplémentaires nécessaires',
      });

      toast.info('Intervention abandonnée');
      onFinalized();
    } catch (err) {
      console.error('Error abandoning intervention:', err);
      toast.error('Erreur lors de l\'abandon');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = baseQuoteTotal + additionalAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finaliser l'intervention</DialogTitle>
          <DialogDescription>
            Confirmez la fin de l'intervention pour procéder au débit.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : hasPendingModification ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Une modification de devis est en attente de validation client. Vous ne pouvez pas finaliser tant que le client n'a pas répondu.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {hasDeclinedModification && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Le client a refusé la modification de devis. Si le dépannage ne peut être effectué sans ces prestations, vous pouvez abandonner l'intervention.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Devis initial</span>
                <span>{baseQuoteTotal.toFixed(2)} €</span>
              </div>
              {additionalAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Prestations supplémentaires</span>
                  <span>+{additionalAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total à débiter</span>
                <span>{totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasDeclinedModification && !hasPendingModification && (
            <Button
              variant="destructive"
              onClick={handleAbandon}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Abandonner
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleFinalize} 
            disabled={isProcessing || hasPendingModification}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Finaliser et débiter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
