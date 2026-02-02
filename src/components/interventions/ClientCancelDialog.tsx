import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

interface ClientCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  interventionId: string;
  interventionStatus: string;
  interventionCategory: string;
  isProcessing?: boolean;
}

interface DisplacementFeeInfo {
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  isCompany: boolean;
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
  const [feeInfo, setFeeInfo] = useState<DisplacementFeeInfo | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);

  // Check if displacement fees apply
  const hasDisplacementFees = ['arrived', 'in_progress'].includes(interventionStatus);

  // Load displacement fee info when dialog opens and fees apply
  useEffect(() => {
    if (!open || !hasDisplacementFees) {
      setFeeInfo(null);
      return;
    }

    const loadFeeInfo = async () => {
      setLoadingFees(true);
      try {
        // Get intervention details to check if client is company
        const { data: intervention } = await supabase
          .from('interventions')
          .select('client_id')
          .eq('id', interventionId)
          .single();

        // Check if client is company
        let isCompany = false;
        if (intervention?.client_id) {
          const { data: user } = await supabase
            .from('users')
            .select('is_company')
            .eq('id', intervention.client_id)
            .single();
          isCompany = user?.is_company ?? false;
        }

        // Get service displacement price
        const { data: service } = await supabase
          .from('services')
          .select('displacement_price, vat_rate_individual, vat_rate_professional')
          .eq('code', interventionCategory)
          .single();

        if (service) {
          const displacementPriceHT = service.displacement_price;
          const vatRate = isCompany ? service.vat_rate_professional : service.vat_rate_individual;
          const vatAmount = Math.round(displacementPriceHT * (vatRate / 100) * 100) / 100;
          const totalTTC = Math.round((displacementPriceHT + vatAmount) * 100) / 100;

          setFeeInfo({
            displacementPriceHT,
            vatRate,
            vatAmount,
            totalTTC,
            isCompany,
          });
        }
      } catch (err) {
        console.error('Error loading displacement fee info:', err);
      } finally {
        setLoadingFees(false);
      }
    };

    loadFeeInfo();
  }, [open, hasDisplacementFees, interventionId, interventionCategory]);

  const handleConfirm = () => {
    onConfirm(reason);
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
        {hasDisplacementFees && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-semibold">{getStatusLabel()}</p>
              {loadingFees ? (
                <p className="text-sm">Calcul des frais en cours...</p>
              ) : feeInfo ? (
                <div className="text-sm space-y-1">
                  <p>
                    Les <strong>frais de déplacement</strong> seront facturés :
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Déplacement HT : {feeInfo.displacementPriceHT.toFixed(2)} €</li>
                    <li>TVA ({feeInfo.vatRate}%) : {feeInfo.vatAmount.toFixed(2)} €</li>
                    <li className="font-semibold">
                      Total TTC : {feeInfo.totalTTC.toFixed(2)} €
                    </li>
                  </ul>
                  <p className="mt-2 italic">
                    Une facture vous sera envoyée par email.
                  </p>
                </div>
              ) : (
                <p className="text-sm">
                  Les frais de déplacement seront facturés conformément à notre politique tarifaire.
                </p>
              )}
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
            ) : hasDisplacementFees ? (
              `Confirmer et payer ${feeInfo?.totalTTC?.toFixed(2) ?? ''} €`
            ) : (
              "Confirmer l'annulation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
