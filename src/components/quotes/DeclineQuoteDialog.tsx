import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';

const DECLINE_REASONS = [
  { value: 'too_expensive', label: 'Le prix est trop élevé' },
  { value: 'not_needed', label: 'Je n\'ai pas besoin de ces prestations' },
  { value: 'will_do_later', label: 'Je préfère reporter ces travaux' },
  { value: 'other', label: 'Autre raison' },
];

interface DeclineQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  processing?: boolean;
}

export function DeclineQuoteDialog({
  open,
  onOpenChange,
  onConfirm,
  processing = false,
}: DeclineQuoteDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const reason = selectedReason === 'other' 
      ? customReason || 'Autre raison non précisée'
      : DECLINE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    
    onConfirm(reason);
  };

  const canConfirm = selectedReason && (selectedReason !== 'other' || customReason.trim());

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Refuser la modification de devis
          </AlertDialogTitle>
          <AlertDialogDescription>
            Veuillez nous indiquer la raison de votre refus afin que nous puissions améliorer nos services.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Warning Alert */}
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <strong>Attention :</strong> Ces prestations ont été préconisées par le technicien pour une résolution optimale de votre dépannage. En les refusant, vous pourriez ne pas bénéficier d'une intervention complète ou durable.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          <Label className="text-sm font-medium">Pourquoi refusez-vous cette modification ?</Label>
          
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {DECLINE_REASONS.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                  {reason.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === 'other' && (
            <Textarea
              placeholder="Précisez la raison de votre refus..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="min-h-[80px]"
            />
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || processing}
            className="w-full sm:w-auto"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Confirmer le refus
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
