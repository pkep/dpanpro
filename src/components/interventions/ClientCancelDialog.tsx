import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useCancellationFeeCheck } from '@/hooks/useCancellationFeeCheck';

interface ClientCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, hasFees: boolean) => void;
  interventionId: string;
  interventionStatus: string;
  interventionCategory: string;
  isProcessing?: boolean;
}

export function ClientCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  interventionId,
  interventionStatus,
  interventionCategory,
  isProcessing = false,
}: ClientCancelDialogProps) {
  const [reason, setReason] = useState('');

  // Use the hook to check for cancellation fees
  const { feeInfo, loading: loadingFees } = useCancellationFeeCheck({
    interventionId,
    interventionStatus,
    interventionCategory,
    enabled: open,
  });

  const hasDisplacementFees = feeInfo?.hasFees ?? false;

  const handleConfirm = () => {
    onConfirm(reason, hasDisplacementFees);
    setReason('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
    }
    onOpenChange(newOpen);
  };

  const isConfirmDisabled = reason.trim().length < 5 || isProcessing;

  const getStatusLabel = () => {
    if (feeInfo?.reason === 'proximity') {
      return `Le technicien est à moins de ${feeInfo.etaMinutes ?? 5} minute(s) de votre adresse.`;
    }
    switch (interventionStatus) {
      case 'arrived':
        return 'Le technicien est arrivé sur les lieux.';
      case 'in_progress':
        return "L'intervention est en cours.";
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler cette demande ?</AlertDialogTitle>
          <AlertDialogDescription>
            Votre demande d'intervention sera annulée définitivement. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Displacement Fee Warning */}
        {(hasDisplacementFees || loadingFees) && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              {loadingFees ? (
                <p className="text-sm">Vérification des frais en cours...</p>
              ) : feeInfo ? (
                <>
                  <p className="font-semibold">{getStatusLabel()}</p>
                  <div className="text-sm space-y-1">
                    <p>
                      Conformément à nos <strong>conditions générales d'utilisation</strong>, les <strong>frais de déplacement</strong> seront facturés :
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Déplacement HT : {feeInfo.displacementPriceHT.toFixed(2)} €</li>
                      <li>TVA ({feeInfo.vatRate}%) : {feeInfo.vatAmount.toFixed(2)} €</li>
                      <li className="font-semibold">
                        Total TTC : {feeInfo.totalTTC.toFixed(2)} €
                      </li>
                    </ul>
                    <p className="mt-2 italic">
                      Le montant sera débité immédiatement et une facture vous sera envoyée par email.
                    </p>
                  </div>
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Motif *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Problème résolu, erreur de saisie, autre prestataire..."
            className="min-h-[80px]"
            disabled={isProcessing}
          />
          {reason.trim().length > 0 && reason.trim().length < 5 && (
            <p className="text-xs text-destructive">
              Le motif doit contenir au moins 5 caractères
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : hasDisplacementFees && feeInfo ? (
              `Confirmer et payer ${feeInfo.totalTTC.toFixed(2)} €`
            ) : (
              "Confirmer l'annulation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
