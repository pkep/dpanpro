import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, PenTool, Eraser, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { interventionsService } from '@/services/interventions/interventions.service';
import { quotesService, QuoteLine } from '@/services/quotes/quotes.service';
import { quoteModificationsService, QuoteModificationItem } from '@/services/quote-modifications/quote-modifications.service';
import { historyService } from '@/services/history/history.service';
import { invoiceService } from '@/services/invoice/invoice.service';
import { useAuth } from '@/hooks/useAuth';
import type { Intervention } from '@/types/intervention.types';

type FinalizeStep = 'review' | 'signature';

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
  const [step, setStep] = useState<FinalizeStep>('review');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [baseQuoteTotal, setBaseQuoteTotal] = useState(0);
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [hasPendingModification, setHasPendingModification] = useState(false);
  const [hasDeclinedModification, setHasDeclinedModification] = useState(false);
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [modificationItems, setModificationItems] = useState<QuoteModificationItem[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('review');
      setSignatureData(null);
      setHasSignature(false);
      loadQuoteData();
    }
  }, [open, intervention.id]);

  // Initialize canvas when signature step is shown
  useEffect(() => {
    if (step === 'signature') {
      initializeCanvas();
    }
  }, [step]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const loadQuoteData = async () => {
    setIsLoading(true);
    try {
      // Get base quote lines
      const lines = await quotesService.getQuoteLines(intervention.id);
      setQuoteLines(lines);
      const baseTotal = lines.reduce((sum, line) => sum + line.calculatedPrice, 0);
      setBaseQuoteTotal(baseTotal);

      // Get modifications
      const modifications = await quoteModificationsService.getModificationsByIntervention(intervention.id);
      const pendingMod = modifications.find((m) => m.status === 'pending');
      const declinedMod = modifications.find((m) => m.status === 'declined');
      const approvedMods = modifications.filter((m) => m.status === 'approved');
      
      setHasPendingModification(!!pendingMod);
      setHasDeclinedModification(!!declinedMod && !approvedMods.length);

      // Collect items from approved modifications (items are already included in modification)
      const allItems: QuoteModificationItem[] = [];
      for (const mod of approvedMods) {
        allItems.push(...mod.items);
      }
      setModificationItems(allItems);

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

  // Canvas drawing handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    setHasSignature(false);
    setSignatureData(null);
  };

  const handleProceedToSignature = () => {
    setStep('signature');
  };

  const handleFinalize = async () => {
    if (!user || !signatureData) return;

    setIsProcessing(true);
    try {
      const finalAmount = baseQuoteTotal + additionalAmount;

      // Capture the payment
      const { error: captureError } = await supabase.functions.invoke('capture-payment', {
        body: {
          interventionId: intervention.id,
          amount: Math.round(finalAmount * 100),
        },
      });

      if (captureError) {
        const msg = captureError.message || '';
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
        comment: `Intervention finalisée avec signature client. Montant débité : ${finalAmount.toFixed(2)} €`,
      });

      // Payment captured successfully - show toast
      toast.success('💳 Paiement débité avec succès !', {
        description: `Montant de ${finalAmount.toFixed(2)} € débité. Facture envoyée au client.`,
        duration: 6000,
      });

      // Send invoice by email (no automatic download)
      try {
        await invoiceService.sendInvoiceByEmail(intervention);
      } catch (invoiceErr) {
        console.error('Error sending invoice:', invoiceErr);
        toast.info('La facture n\'a pas pu être envoyée automatiquement par email.');
      }

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

  const handleAbandon = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error: cancelError } = await supabase.functions.invoke('cancel-payment', {
        body: { interventionId: intervention.id },
      });

      if (cancelError) {
        console.error('Error cancelling payment:', cancelError);
      }

      await interventionsService.updateStatus(intervention.id, 'cancelled');

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

  // Build list of all services for signature text
  const allServices = [
    ...quoteLines.map(line => line.label),
    ...modificationItems.map(item => item.label),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'review' ? 'Finaliser l\'intervention' : 'Signature du client'}
          </DialogTitle>
          <DialogDescription>
            {step === 'review' 
              ? 'Vérifiez le récapitulatif avant de faire signer le client.'
              : 'Le client doit signer pour confirmer la réalisation des prestations.'}
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
        ) : step === 'review' ? (
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
              <p className="text-sm font-medium mb-3">Prestations réalisées :</p>
              
              {quoteLines.map((line) => (
                <div key={line.id} className="flex justify-between text-sm">
                  <span>• {line.label}</span>
                  <span>{line.calculatedPrice.toFixed(2)} €</span>
                </div>
              ))}
              
              {modificationItems.length > 0 && (
                <>
                  <div className="border-t my-2" />
                  <p className="text-sm font-medium text-green-600">Suppléments approuvés :</p>
                  {modificationItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-green-600">
                      <span>• {item.label}</span>
                      <span>+{item.totalPrice.toFixed(2)} €</span>
                    </div>
                  ))}
                </>
              )}

              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total à débiter</span>
                <span>{totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Signature declaration text */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm leading-relaxed">
                Je reconnais que les prestations suivantes :
              </p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                {allServices.map((service, idx) => (
                  <li key={idx}>{service}</li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed mt-3 font-medium">
                ont bien été réalisées et que le dépannage a été effectué dans les règles de l'art.
              </p>
              <p className="text-sm mt-2 text-muted-foreground">
                Montant total : <span className="font-bold text-foreground">{totalAmount.toFixed(2)} €</span>
              </p>
            </div>

            {/* Signature canvas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PenTool className="h-4 w-4" />
                Signature du client
              </div>
              
              <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full touch-none cursor-crosshair"
                  style={{ height: '150px' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-muted-foreground/50 text-sm">
                      Signez ici
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  disabled={!hasSignature}
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Effacer
                </Button>
                
                {hasSignature && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Signature enregistrée
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'review' ? (
            <>
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
                onClick={handleProceedToSignature} 
                disabled={hasPendingModification}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Faire signer le client
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('review')}>
                Retour
              </Button>
              <Button 
                onClick={handleFinalize} 
                disabled={isProcessing || !hasSignature}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Valider et débiter {totalAmount.toFixed(2)} €
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
