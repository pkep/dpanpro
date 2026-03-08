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
  PenTool,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { workPhotosService, WorkPhoto } from '@/services/work-photos/work-photos.service';
import { quotesService, QuoteLine } from '@/services/quotes/quotes.service';
import { quoteModificationsService } from '@/services/quote-modifications/quote-modifications.service';
import { servicesService } from '@/services/services/services.service';
import { quotePDFService } from '@/services/quote-pdf/quote-pdf.service';
import { interventionsService } from '@/services/interventions/interventions.service';
import { paymentService } from '@/services/payment/payment.service';
import { supabase } from '@/integrations/supabase/client';
import { PhotoStep } from './PhotoStep';
import { QuoteReviewStep } from './QuoteReviewStep';
import { AddItemsStep } from './AddItemsStep';
import { SignatureCanvas } from '@/components/quotes/SignatureCanvas';
import type { StartStep, QuoteModificationItem, StartInterventionDialogProps, QuoteConfig, VarianteOption } from './types';

const STEP_TITLES: Record<StartStep, string> = {
  photos: 'Photos de la panne',
  quote_review: 'Validation du devis',
  add_items: 'Prestations complémentaires',
  signature: 'Signature du client',
  payment_pending: 'Autorisation de paiement',
  processing: 'Traitement en cours',
};

const STEP_DESCRIPTIONS: Record<StartStep, string> = {
  photos: 'Prenez au moins une photo pour documenter l\'état initial de la panne.',
  quote_review: 'Vérifiez le devis. Le client doit le signer pour commencer l\'intervention.',
  add_items: 'Ajoutez les prestations ou équipements supplémentaires nécessaires.',
  signature: 'Le client doit signer pour valider le devis et lancer l\'intervention.',
  payment_pending: 'En attente de l\'autorisation de paiement du client.',
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
  const [paymentAuthorized, setPaymentAuthorized] = useState(false);
  const [quoteConfig, setQuoteConfig] = useState<QuoteConfig | null>(null);
  const [selectedVarianteId, setSelectedVarianteId] = useState<string | null>(null);
  const [laborPrice, setLaborPrice] = useState(0);

  // Track if dialog has been opened to avoid resetting during close
  const [initialized, setInitialized] = useState(false);

  // Reset state and load data when dialog opens
  useEffect(() => {
    if (open && interventionId) {
      if (!initialized) {
        setSelectedFiles([]);
        setPreviews([]);
        setPendingItems([]);
        setSignatureData(null);
        setError(null);
        setPaymentAuthorized(false);
        setInitialized(true);

        // Check if steps were already completed (technician returning after closing)
        detectCompletedSteps();
      }
      loadQuoteData();
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, interventionId]);

  // Detect already-completed steps to avoid re-doing the whole flow
  const detectCompletedSteps = async () => {
    try {
      // Check if before photos already exist
      const existingPhotos = await workPhotosService.getPhotos(interventionId);
      const hasBeforePhotos = existingPhotos.some(p => p.photoType === 'before');

      // Check if quote is already signed
      const { data: intData } = await supabase
        .from('interventions')
        .select('quote_signed_at, quote_signature_data')
        .eq('id', interventionId)
        .single();

      const quoteSigned = !!intData?.quote_signed_at;

      // Check if payment is already authorized
      const { data: authData } = await supabase
        .from('payment_authorizations')
        .select('status')
        .eq('intervention_id', interventionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isAuthorized = authData?.status === 'authorized';

      if (quoteSigned && isAuthorized) {
        // Everything done — go straight to payment_pending (authorized) to finalize
        setPaymentAuthorized(true);
        setStep('payment_pending');
      } else if (quoteSigned && !isAuthorized) {
        // Quote signed but payment pending
        setStep('payment_pending');
      } else if (hasBeforePhotos) {
        // Photos done, skip to quote review
        setStep('quote_review');
      } else {
        setStep('photos');
      }
    } catch (err) {
      console.error('Error detecting completed steps:', err);
      setStep('photos');
    }
  };

  // Real-time listener for payment authorization
  useEffect(() => {
    if (step !== 'payment_pending' || !interventionId) return;

    const channel = supabase
      .channel(`payment-auth-${interventionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_authorizations',
          filter: `intervention_id=eq.${interventionId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          if (newStatus === 'authorized') {
            setPaymentAuthorized(true);
            toast.success('Paiement autorisé par le client !');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, interventionId]);

  const loadQuoteData = async () => {
    try {
      const lines = await quotesService.getQuoteLines(interventionId);
      setQuoteLines(lines);

      // Load client company status
      let clientIsCompany = false;
      if (clientId) {
        const { data: clientData } = await supabase
          .from('users')
          .select('is_company')
          .eq('id', clientId)
          .single();
        if (clientData) {
          clientIsCompany = clientData.is_company || false;
          setIsCompany(clientIsCompany);
        }
      }

      // Load service config
      const services = await servicesService.getActiveServices();
      const service = services.find((s) => s.code === category);
      let currentVatRate = 10;
      let displacementPrice = 0;
      let securityPrice = 0;
      if (service) {
        currentVatRate = clientIsCompany ? service.vatRateProfessional : service.vatRateIndividual;
        setVatRate(currentVatRate);
        displacementPrice = service.displacementPrice;
        securityPrice = service.securityPrice;
      }

      // Load questionnaire resultat + variantes
      const { data: interventionData } = await supabase
        .from('interventions')
        .select('questionnaire_resultat_id, prix_min, prix_max, title, questionnaire_answers')
        .eq('id', interventionId)
        .single();

      if (interventionData) {
        let resultatNom = interventionData.title || 'Prestation';
        let prixMin = interventionData.prix_min;
        let prixMax = interventionData.prix_max;
        let mappedVariantes: VarianteOption[] = [];

        if (interventionData.questionnaire_resultat_id) {
          const { data: resultat } = await supabase
            .from('questionnaire_resultats')
            .select('id, nom, prix_min, prix_max')
            .eq('id', interventionData.questionnaire_resultat_id)
            .single();

          const { data: variantes } = await supabase
            .from('questionnaire_variantes')
            .select('id, nom, description, prix_min, prix_max, display_order')
            .eq('resultat_id', interventionData.questionnaire_resultat_id)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (resultat) {
            resultatNom = resultat.nom;
            prixMin = resultat.prix_min ?? prixMin;
            prixMax = resultat.prix_max ?? prixMax;
          }

          mappedVariantes = (variantes || []).map(v => ({
            id: v.id,
            nom: v.nom,
            description: v.description,
            prixMin: v.prix_min,
            prixMax: v.prix_max,
          }));
        }

        const rawAnswers = interventionData.questionnaire_answers;
        const questionnaireAnswers: string[] = Array.isArray(rawAnswers) ? rawAnswers.map(String) : [];

        const config: QuoteConfig = {
          resultatNom,
          resultatPrixMin: prixMin,
          resultatPrixMax: prixMax,
          variantes: mappedVariantes,
          displacementPrice,
          securityPrice,
          vatRate: currentVatRate,
          questionnaireAnswers,
        };
        setQuoteConfig(config);

        // Calculate default labor (to reach min price HT)
        const minTTC = prixMin || 0;
        const minHT = minTTC / (1 + currentVatRate / 100);
        const defaultLabor = Math.max(0, Math.round((minHT - displacementPrice - securityPrice) * 100) / 100);
        setLaborPrice(defaultLabor);
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

  // Calculate total TTC for payment
  const getTotalTTC = () => {
    // Base: displacement + security + labor
    const dp = quoteConfig?.displacementPrice || 0;
    const sp = quoteConfig?.securityPrice || 0;
    const baseHT = dp + sp + laborPrice;
    const additionalTotal = pendingItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const totalHT = baseHT + additionalTotal;
    const vatAmount = Math.round(totalHT * (vatRate / 100) * 100) / 100;
    return Math.round((totalHT + vatAmount) * 100) / 100;
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
      // After signature, request payment authorization from client
      await requestPaymentAuthorization();
    } else if (step === 'payment_pending') {
      if (!paymentAuthorized) {
        setError('En attente de l\'autorisation de paiement du client');
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
    // Cannot go back from payment_pending (signature already done)
  };

  const handleAddItems = () => {
    setStep('add_items');
  };

  const requestPaymentAuthorization = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const totalTTC = getTotalTTC();
      const email = clientEmail || '';

      if (!email) {
        setError('Email du client manquant, impossible de demander l\'autorisation de paiement.');
        setIsLoading(false);
        return;
      }

      // === PERSIST DATA BEFORE SENDING PAYMENT REQUEST ===

      // 1. Save quote lines
      if (quoteConfig) {
        const newLines: import('@/services/quotes/quotes.service').QuoteInput[] = [];
        if (quoteConfig.displacementPrice > 0) {
          newLines.push({ lineType: 'displacement', label: 'Déplacement technicien', basePrice: quoteConfig.displacementPrice, multiplier: 1 });
        }
        if (quoteConfig.securityPrice > 0) {
          newLines.push({ lineType: 'security', label: 'Mise en sécurité', basePrice: quoteConfig.securityPrice, multiplier: 1 });
        }
        if (laborPrice > 0) {
          newLines.push({ lineType: 'repair', label: 'Main d\'œuvre', basePrice: laborPrice, multiplier: 1 });
        }
        if (newLines.length > 0) {
          await quotesService.saveQuoteLines(interventionId, newLines);
        }
      }

      // 2. Upload before photos
      if (selectedFiles.length > 0) {
        await workPhotosService.uploadPhotos(
          interventionId,
          selectedFiles,
          'before',
          userId
        );
      }

      // 3. Save signature
      if (signatureData) {
        await supabase
          .from('interventions')
          .update({
            quote_signed_at: new Date().toISOString(),
            quote_signature_data: signatureData,
          })
          .eq('id', interventionId);
      }

      // 4. Handle pending items (quote modifications)
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
        await quoteModificationsService.approveModification(modification.id, signatureData || undefined);
      }

      // === NOW SEND PAYMENT REQUEST ===

      // Create payment authorization in DB (pending)
      await paymentService.createPaymentIntent({
        interventionId,
        amount: totalTTC,
        clientEmail: email,
        clientPhone: clientPhone || undefined,
      });

      // Notify client via SMS + Email + Push
      await supabase.functions.invoke('notify-payment-required', {
        body: { interventionId, reason: 'start_intervention' },
      });

      setStep('payment_pending');
      toast.info('Demande d\'autorisation envoyée au client');
    } catch (err: any) {
      console.error('Error requesting payment authorization:', err);
      setError(err?.message || 'Erreur lors de la demande d\'autorisation');
    } finally {
      setIsLoading(false);
    }
  };

  const processIntervention = async () => {
    setStep('processing');
    setIsLoading(true);
    setError(null);

    try {
      // Get existing before photos
      const existingPhotos = await workPhotosService.getPhotos(interventionId);
      const uploadedPhotos = existingPhotos.filter(p => p.photoType === 'before');

      // Increment authorization if there are pending additional items
      if (pendingItems.length > 0) {
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

      // Update status to in_progress FIRST (most important action)
      await interventionsService.updateStatus(interventionId, 'in_progress', 'arrived');
      await historyService.addHistoryEntry({
        interventionId,
        userId,
        action: 'status_changed',
        oldValue: 'arrived',
        newValue: 'in_progress',
      });

      // Generate and send quote PDF (non-blocking — don't fail the whole process)
      generateAndSendQuotePDF().catch(err => {
        console.error('Error sending quote email (non-blocking):', err);
      });

      toast.success('Devis validé, intervention démarrée');
      onOpenChange(false);
      onSuccess(uploadedPhotos);
    } catch (err: any) {
      console.error('Error processing intervention:', err);
      setError(err?.message || 'Erreur lors du traitement');
      setStep('payment_pending');
      setIsLoading(false);
    }
  };

  const generateAndSendQuotePDF = async () => {
    try {
      const intervention = await interventionsService.getIntervention(interventionId);
      const savedSignature = signatureData || intervention?.quoteSignatureData || null;
      const { base64, fileName } = await quotePDFService.generateQuoteBase64(intervention, savedSignature);
      
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
      console.error('Error generating/sending quote PDF:', pdfErr);
    }
  };

  const resendPaymentNotification = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await supabase.functions.invoke('notify-payment-required', {
        body: { interventionId, reason: 'start_intervention' },
      });
      toast.success('Notification renvoyée au client');
    } catch (err: any) {
      console.error('Error resending notification:', err);
      setError('Erreur lors du renvoi de la notification');
    } finally {
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
      case 'payment_pending':
        return paymentAuthorized;
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
        return 'Envoyer la demande de paiement';
      case 'payment_pending':
        return 'Valider et commencer';
      default:
        return 'Suivant';
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'photos' && <Camera className="h-5 w-5" />}
            {step === 'signature' && <PenTool className="h-5 w-5" />}
            {step === 'payment_pending' && <CreditCard className="h-5 w-5" />}
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
                quoteConfig={quoteConfig}
                selectedVarianteId={selectedVarianteId}
                onVarianteChange={setSelectedVarianteId}
                laborPrice={laborPrice}
                onLaborPriceChange={setLaborPrice}
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
                quoteConfig={quoteConfig}
                selectedVarianteId={selectedVarianteId}
                onVarianteChange={setSelectedVarianteId}
                laborPrice={laborPrice}
                onLaborPriceChange={setLaborPrice}
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

          {step === 'payment_pending' && (
            <div className="space-y-4">
              {!paymentAuthorized ? (
                <>
                  <div className="flex flex-col items-center justify-center py-6 gap-4">
                    <div className="relative">
                      <CreditCard className="h-12 w-12 text-primary" />
                      <div className="absolute -top-1 -right-1">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">En attente du client</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Le client a reçu une demande d'autorisation de paiement par SMS et email.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Montant : <strong className="text-foreground">{formatPrice(getTotalTTC())}</strong>
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Vous pouvez fermer cette fenêtre et préparer votre matériel.
                      L'intervention démarrera automatiquement une fois le paiement autorisé.
                    </AlertDescription>
                  </Alert>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      try {
                        await supabase.functions.invoke('notify-payment-required', {
                          body: { interventionId, reason: 'reminder' },
                        });
                        toast.success('Rappel envoyé au client');
                      } catch {
                        toast.error('Erreur lors de l\'envoi du rappel');
                      }
                    }}
                  >
                    Renvoyer la notification au client
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Paiement autorisé !</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Le client a autorisé {formatPrice(getTotalTTC())}. Vous pouvez maintenant démarrer l'intervention.
                    </p>
                  </div>
                </div>
              )}

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
            {step !== 'photos' && step !== 'payment_pending' && (
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
            {step === 'payment_pending' && !paymentAuthorized && (
              <Button variant="outline" onClick={handleClose}>
                Fermer (en attente)
              </Button>
            )}
            <Button onClick={handleNext} disabled={!canProceed() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : step === 'payment_pending' && paymentAuthorized ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : step === 'signature' ? (
                <CreditCard className="h-4 w-4 mr-2" />
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
