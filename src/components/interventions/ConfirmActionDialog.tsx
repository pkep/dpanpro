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

type ActionType = 'decline' | 'accept' | 'go' | 'cancel' | 'en_route' | 'cancel_intervention' | null;

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionType;
  onConfirm: (reason?: string) => void;
}

const ACTION_CONFIG: Record<NonNullable<ActionType>, {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: 'default' | 'destructive';
  requiresReason: boolean;
  reasonPlaceholder?: string;
}> = {
  decline: {
    title: 'Refuser cette intervention ?',
    description: 'Cette intervention ne vous sera plus proposée. Veuillez indiquer un motif.',
    confirmLabel: 'Confirmer le refus',
    confirmVariant: 'destructive',
    requiresReason: true,
    reasonPlaceholder: 'Ex: Trop éloigné, manque de compétences, charge de travail...',
  },
  accept: {
    title: 'Accepter cette intervention ?',
    description: 'Vous serez assigné à cette intervention. Les autres interventions disponibles ne seront plus visibles.',
    confirmLabel: 'Accepter',
    confirmVariant: 'default',
    requiresReason: false,
  },
  go: {
    title: 'Y aller maintenant ?',
    description: 'Vous serez assigné et mis en route immédiatement. La navigation vers le lieu d\'intervention sera ouverte.',
    confirmLabel: 'Y aller',
    confirmVariant: 'default',
    requiresReason: false,
  },
  en_route: {
    title: 'Confirmer le départ ?',
    description: 'Confirmez que vous êtes en route vers le lieu d\'intervention.',
    confirmLabel: 'En route',
    confirmVariant: 'default',
    requiresReason: false,
  },
  cancel: {
    title: 'Annuler cette intervention ?',
    description: 'L\'intervention sera reproposée aux 3 techniciens les plus proches. Veuillez indiquer un motif.',
    confirmLabel: 'Confirmer l\'annulation',
    confirmVariant: 'destructive',
    requiresReason: true,
    reasonPlaceholder: 'Ex: Urgence personnelle, panne véhicule, client injoignable...',
  },
  cancel_intervention: {
    title: 'Annuler cette intervention ?',
    description: 'L\'intervention sera annulée et reproposée à d\'autres techniciens. Cette action est irréversible.',
    confirmLabel: 'Confirmer l\'annulation',
    confirmVariant: 'destructive',
    requiresReason: true,
    reasonPlaceholder: 'Ex: Urgence personnelle, panne véhicule, indisponibilité...',
  },
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = useState('');
  
  if (!action) return null;
  
  const config = ACTION_CONFIG[action];

  const handleConfirm = () => {
    onConfirm(config.requiresReason ? reason : undefined);
    setReason('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
    }
    onOpenChange(newOpen);
  };

  const isConfirmDisabled = config.requiresReason && reason.trim().length < 5;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {config.requiresReason && (
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Motif *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={config.reasonPlaceholder}
              className="min-h-[80px]"
            />
            {reason.trim().length > 0 && reason.trim().length < 5 && (
              <p className="text-xs text-destructive">
                Le motif doit contenir au moins 5 caractères
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={config.confirmVariant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {config.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
