import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Plus,
  PenTool
} from 'lucide-react';
import { toast } from 'sonner';
import { workPhotosService, WorkPhoto } from '@/services/work-photos/work-photos.service';
import { quotesService, QuoteLine } from '@/services/quotes/quotes.service';
import { quoteModificationsService } from '@/services/quote-modifications/quote-modifications.service';
import { servicesService } from '@/services/services/services.service';
import { quotePDFService } from '@/services/quote-pdf/quote-pdf.service';
import { interventionsService } from '@/services/interventions/interventions.service';
import { supabase } from '@/integrations/supabase/client';
import { PhotoStep } from './PhotoStep';
import { QuoteReviewStep } from './QuoteReviewStep';
import { AddItemsStep } from './AddItemsStep';
import { SignatureCanvas } from '@/components/quotes/SignatureCanvas';
import type { StartStep, QuoteModificationItem, StartInterventionDialogProps } from './types';

const STEP_TITLES: Record<StartStep, string> = {
  photos: 'Photos de la panne',
  quote_review: 'Validation du devis',
  add_items: 'Prestations complémentaires',
  signature: 'Signature du client',
  processing: 'Traitement en cours',
};

const STEP_DESCRIPTIONS: Record<StartStep, string> = {
  photos: 'Prenez au moins une photo pour documenter l\'état initial de la panne.',
  quote_review: 'Vérifiez le devis. Le client doit le signer pour commencer l\'intervention.',
  add_items: 'Ajoutez les prestations ou équipements supplémentaires nécessaires.',
  signature: 'Le client doit signer pour valider le devis et lancer l\'intervention.',
  processing: 'Génération du devis et démarrage de l\'intervention...',
};

export function StartInterventionDialog({
  open,
  onOpenChange,
  interventionId,
  userId,
  category,
  clientEmail,
  clientPhone,
  clientId,
  onSuccess,
}: StartInterventionDialogProps) {
  const [step, setStep] = useState<StartStep>('photos');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [pendingItems, setPendingItems] = useState<QuoteModificationItem[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vatRate, setVatRate] = useState(10);
  const [isCompany, setIsCompany] = useState(false);

  // Track if dialog has been opened to avoid resetting during close
  const [initialized, setInitialized] = useState(false);

  // Reset state and load data when dialog opens
  useEffect(() => {
    if (open && interventionId) {
      // Only reset on fresh open
      if (!initialized) {
        setStep('photos');
        setSelectedFiles([]);
        setPreviews([]);
        setPendingItems([]);
        setSignatureData(null);
        setError(null);
        setInitialized(true);
      }
      loadQuoteData();
    }
    if (!open) {
      // Mark as not initialized so next open resets
      setInitialized(false);
    }
  }, [open, interventionId]);

  const loadQuoteData = async () => {
    try {
      const lines = await quotesService.getQuoteLines(interventionId);
      setQuoteLines(lines);

      // Get client company status and VAT rate
      if (clientId) {
        const { data: clientData } = await supabase
          .from('users')
          .select('is_company')
          .eq('id', clientId)
          .single();
        if (clientData) {
          setIsCompany(clientData.is_company || false);
        }
      }

      // Get VAT rate from service
      const services = await servicesService.getActiveServices();
      const service = services.find((s) => s.code === category);
      if (service) {
        setVatRate(isCompany ? service.vatRateProfessional : service.vatRateIndividual);
      }
    } catch (err) {
      console.error('Error loading quote data:', err);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setError(null);
    setSelectedFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setPendingItems([
      ...pendingItems,
      {
        id: crypto.randomUUID(),
        itemType: 'service',
        label: '',
        description: '',
        unitPrice: 0,
        quantity: 1,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setPendingItems(pendingItems.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<QuoteModificationItem>) => {
    setPendingItems(
      pendingItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleNext = async () => {
    if (step === 'photos') {
      if (selectedFiles.length === 0) {
        setError('Vous devez ajouter au moins une photo de la panne');
        return;
      }
      setStep('quote_review');
    } else if (step === 'quote_review') {
      setStep('signature');
    } else if (step === 'add_items') {
      // Validate items
      const invalidItems = pendingItems.filter((item) => !item.label || item.unitPrice <= 0);
      if (invalidItems.length > 0) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }
      setStep('signature');
    } else if (step === 'signature') {
      if (!signatureData) {
        setError('Le client doit signer le devis');
        return;
      }
      await processIntervention();
    }
  };

  const handleBack = () => {
    if (step === 'quote_review') {
      setStep('photos');
    } else if (step === 'add_items') {
      setStep('quote_review');
    } else if (step === 'signature') {
      if (pendingItems.length > 0) {
        setStep('add_items');
      } else {
        setStep('quote_review');
      }
    }
  };

  const handleAddItems = () => {
    setStep('add_items');
  };

  const processIntervention = async () => {
    setStep('processing');
    setIsLoading(true);
    setError(null);

    try {
      // 1. Upload photos
      const uploadedPhotos = await workPhotosService.uploadPhotos(
        interventionId,
        selectedFiles,
        'before',
        userId
      );

      // 2. If there are pending items, create a quote modification and handle authorization increment
      if (pendingItems.length > 0) {
        const modification = await quoteModificationsService.createModification({
          interventionId,
          createdBy: userId,
          items: pendingItems.map((item) => ({
            itemType: item.itemType,
            label: item.label,
            description: item.description || undefined,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        });

        // Auto-approve since client signed on-site
        await quoteModificationsService.approveModification(modification.id, signatureData || undefined);

        // Try to increment authorization with the additional amount
        const totalAdditional = pendingItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
        if (totalAdditional > 0) {
          try {
            await supabase.functions.invoke('increment-authorization', {
              body: { interventionId, additionalAmount: totalAdditional },
            });
          } catch (authErr) {
            console.warn('Authorization increment failed, will be handled at capture:', authErr);
          }
        }
      }

      // 3. Save signature to intervention
      const { error: updateError } = await supabase
        .from('interventions')
        .update({
          quote_signed_at: new Date().toISOString(),
          quote_signature_data: signatureData,
        })
        .eq('id', interventionId);

      if (updateError) {
        console.error('Error saving signature:', updateError);
      }

      // 4. Get intervention for PDF generation
      const intervention = await interventionsService.getIntervention(interventionId);

      // 5. Generate and send quote PDF
      try {
        const { base64, fileName } = await quotePDFService.generateQuoteBase64(intervention, signatureData);
        
        await supabase.functions.invoke('send-quote-email', {
          body: {
            interventionId,
            quoteBase64: base64,
            quoteFileName: fileName,
            clientEmail,
            clientPhone,
          },
        });
      } catch (pdfErr) {
        console.error('Error sending quote email:', pdfErr);
        // Don't fail the whole process for email
      }

      toast.success('Devis validé, intervention démarrée');
      onOpenChange(false);
      onSuccess(uploadedPhotos);
    } catch (err: any) {
      console.error('Error processing intervention:', err);
      setError(err?.message || 'Erreur lors du traitement');
      setStep('signature');
      setIsLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false);
    }
  }, [isLoading, onOpenChange]);

  const canProceed = () => {
    switch (step) {
      case 'photos':
        return selectedFiles.length > 0;
      case 'quote_review':
        return true;
      case 'add_items':
        return pendingItems.every((item) => item.label && item.unitPrice > 0);
      case 'signature':
        return !!signatureData;
      default:
        return false;
    }
  };

  const getNextButtonText = () => {
    switch (step) {
      case 'photos':
        return 'Voir le devis';
      case 'quote_review':
        return 'Passer à la signature';
      case 'add_items':
        return 'Continuer vers la signature';
      case 'signature':
        return 'Valider et commencer';
      default:
        return 'Suivant';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'photos' && <Camera className="h-5 w-5" />}
            {step === 'signature' && <PenTool className="h-5 w-5" />}
            {step === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {STEP_TITLES[step]}
          </DialogTitle>
          <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'photos' && (
            <PhotoStep
              previews={previews}
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              disabled={isLoading}
              error={error}
            />
          )}

          {step === 'quote_review' && (
            <div className="space-y-4">
              <QuoteReviewStep
                quoteLines={quoteLines}
                pendingItems={pendingItems}
                vatRate={vatRate}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddItems}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter des prestations complémentaires
              </Button>
            </div>
          )}

          {step === 'add_items' && (
            <AddItemsStep
              items={pendingItems}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              disabled={isLoading}
            />
          )}

          {step === 'signature' && (
            <div className="space-y-4">
              <QuoteReviewStep
                quoteLines={quoteLines}
                pendingItems={pendingItems}
                vatRate={vatRate}
              />
              {pendingItems.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    En signant, vous acceptez les prestations complémentaires ci-dessus et autorisez Depan.Pro à procéder à l'augmentation de l'autorisation bancaire du montant correspondant à ces prestations/services ajoutés.
                  </AlertDescription>
                </Alert>
              )}
              <SignatureCanvas
                onSignatureChange={setSignatureData}
                disabled={isLoading}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Traitement en cours...</p>
            </div>
          )}
        </div>

        {step !== 'processing' && (
          <DialogFooter className="gap-2 sm:gap-0">
            {step !== 'photos' && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            )}
            {step === 'photos' && (
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Annuler
              </Button>
            )}
            <Button onClick={handleNext} disabled={!canProceed() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : step === 'signature' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {getNextButtonText()}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
