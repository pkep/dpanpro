import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { dispatchService } from '@/services/dispatch/dispatch.service';
import { quotesService, QuoteInput, QuoteSummary } from '@/services/quotes/quotes.service';
import { paymentService } from '@/services/payment/payment.service';
import { pricingService } from '@/services/pricing/pricing.service';
import { servicesService, Service } from '@/services/services/services.service';
import { InterventionCategory, CATEGORY_LABELS } from '@/types/intervention.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Loader2, Send, Key, Wrench, Zap, Grid3X3, Flame, Snowflake, Settings, MessageSquareText, UserRound, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StepServiceSelection } from './steps/StepServiceSelection';
import { StepProblemDescription } from './steps/StepProblemDescription';
import { StepContactInfo } from './steps/StepContactInfo';
import { StepPayment } from './steps/StepPayment';
import { StepSummary } from './steps/StepSummary';

const categoryIcons: Record<InterventionCategory, React.ReactNode> = {
  locksmith: <Key className="h-5 w-5" />,
  plumbing: <Wrench className="h-5 w-5" />,
  electricity: <Zap className="h-5 w-5" />,
  glazing: <Grid3X3 className="h-5 w-5" />,
  heating: <Flame className="h-5 w-5" />,
  aircon: <Snowflake className="h-5 w-5" />,
};

const STEPS = [
  { id: 1, title: 'Service', icon: <Settings className="h-4 w-4" /> },
  { id: 2, title: 'Problème', icon: <MessageSquareText className="h-4 w-4" /> },
  { id: 3, title: 'Contact', icon: <UserRound className="h-4 w-4" /> },
  { id: 4, title: 'Paiement', icon: <CreditCard className="h-4 w-4" /> },
  { id: 5, title: 'Validation', icon: <CheckCircle className="h-4 w-4" /> },
];

interface InterventionWizardProps {
  embedded?: boolean;
}

export function InterventionWizard({ embedded = false }: InterventionWizardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<InterventionCategory | null>(null);
  const [priority, setPriority] = useState<string>('normal');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Payment state
  const [quoteSummary, setQuoteSummary] = useState<QuoteSummary | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [multiplierLabel, setMultiplierLabel] = useState('Normal');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isPaymentAuthorized, setIsPaymentAuthorized] = useState(false);
  const [authorizationId, setAuthorizationId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [interventionId, setInterventionId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isCompany, setIsCompany] = useState(false);

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const activeServices = await servicesService.getActiveServices();
        setServices(activeServices);
      } catch (error) {
        console.error('Error loading services:', error);
      }
    };
    loadServices();
  }, []);

  // Load service from URL params
  useEffect(() => {
    const serviceParam = searchParams.get('service');
    if (serviceParam) {
      const validCategories: InterventionCategory[] = ['locksmith', 'plumbing', 'electricity', 'glazing', 'heating', 'aircon'];
      if (validCategories.includes(serviceParam as InterventionCategory)) {
        setCategory(serviceParam as InterventionCategory);
        setCurrentStep(2); // Skip to step 2 if service is pre-selected
      }
    }
    
    // Check for payment callback
    const paymentStatus = searchParams.get('payment');
    const returnedAuthId = searchParams.get('authorization_id');
    
    if (paymentStatus === 'success' && returnedAuthId) {
      setIsPaymentAuthorized(true);
      setAuthorizationId(returnedAuthId);
      setCurrentStep(5); // Move to validation step
      toast.success('Autorisation de paiement confirmée !');
    } else if (paymentStatus === 'cancelled') {
      toast.error('Autorisation de paiement annulée');
      setCurrentStep(4);
    }
  }, [searchParams]);

  // Generate quote when moving to payment step
  useEffect(() => {
    const generateQuote = async () => {
      if (currentStep === 4 && category && !isPaymentAuthorized) {
        try {
          // Get service details
          const service = services.find(s => s.code === category);
          if (!service) {
            toast.error('Service non trouvé');
            return;
          }

          // Use the service's default priority
          const servicePriority = service.defaultPriority || 'normal';
          setPriority(servicePriority);

          // Get multiplier based on service's default priority
          const multipliers = await pricingService.getPriorityMultipliers();
          const priorityMultiplier = multipliers.find(m => m.priority === servicePriority);
          const mult = priorityMultiplier?.multiplier || 1.0;
          setMultiplier(mult);
          setMultiplierLabel(priorityMultiplier?.label || 'Normal');

          // Determine if client is a company (for logged-in users)
          const clientIsCompany = user?.isCompany || false;
          setIsCompany(clientIsCompany);

          // Get effective multiplier (respecting both global and individual settings)
          const effectiveMultiplier = await quotesService.getEffectiveMultiplier(servicePriority, mult);

          // Generate quote summary with HT, VAT, TTC
          const summary = quotesService.calculateQuoteSummary(service, effectiveMultiplier, clientIsCompany, true);
          setQuoteSummary(summary);
        } catch (error) {
          console.error('Error generating quote:', error);
          toast.error('Erreur lors de la génération du devis');
        }
      }
    };

    generateQuote();
  }, [currentStep, category, services, isPaymentAuthorized, user]);

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return category !== null;
      case 2:
        return description.trim().length >= 10 && 
               address.trim().length >= 5 && 
               /^\d{5}$/.test(postalCode) && 
               city.trim().length >= 2;
      case 3:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
               phone.trim().length >= 10;
      case 4:
        return isPaymentAuthorized;
      case 5:
        return isPaymentAuthorized;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInitializePayment = async () => {
    if (!category || !email || isPaymentProcessing || clientSecret || !quoteSummary) return;

    setIsPaymentProcessing(true);
    try {
      // Create a temporary intervention to get an ID
      // For guest users, pass null as clientId (DB allows nullable client_id)
      const clientId = user?.id || null;

      const intervention = await interventionsService.createIntervention(clientId, {
        category,
        description,
        address,
        city,
        postalCode,
        priority: priority as 'urgent' | 'high' | 'normal' | 'low',
        clientEmail: email,
        clientPhone: phone,
        photos: photos.length > 0 ? photos : undefined,
      });

      setInterventionId(intervention.id);

      // Save quote lines to database
      await quotesService.saveQuoteLines(intervention.id, quoteSummary.lines);

      // Create payment intent with TTC amount and get client secret for Stripe Elements
      const result = await paymentService.createPaymentIntent({
        interventionId: intervention.id,
        amount: quoteSummary.totalTTC,
        clientEmail: email,
        clientPhone: phone,
      });

      setAuthorizationId(result.id);
      setClientSecret(result.clientSecret);
    } catch (error) {
      console.error('Error initializing payment:', error);
      toast.error('Erreur lors de l\'initialisation du paiement');
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setIsPaymentAuthorized(true);
    if (authorizationId) {
      await paymentService.updateAuthorizationStatus(authorizationId, 'authorized');
    }
    toast.success('Autorisation de paiement confirmée !');
    // Auto advance to next step
    setCurrentStep(5);
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Erreur de paiement: ${error}`);
  };

  const handleSubmit = async () => {
    if (!isPaymentAuthorized) {
      toast.error('Veuillez d\'abord autoriser le paiement');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update authorization status to authorized
      if (authorizationId) {
        await paymentService.updateAuthorizationStatus(authorizationId, 'authorized');
      }

      // Get the intervention that was created during payment
      const auth = authorizationId ? await paymentService.getAuthorization(authorizationId) : null;
      
      if (auth) {
        const intervention = await interventionsService.getIntervention(auth.interventionId);
        setTrackingCode(intervention?.trackingCode || null);
        
        // Send notifications to technicians now that intervention is confirmed
        try {
          await dispatchService.notifyTechnicians(auth.interventionId);
          console.log('Technician notifications sent after confirmation');
        } catch (notifyError) {
          console.error('Error sending technician notifications:', notifyError);
          // Non-blocking - don't fail the whole submission
        }
      }

      setIsSubmitted(true);
      toast.success('Demande envoyée avec succès !');
    } catch (error) {
      console.error('Error finalizing intervention:', error);
      toast.error('Erreur lors de la finalisation de la demande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepServiceSelection
            selectedCategory={category}
            onSelect={(cat, autoAdvance) => {
              setCategory(cat);
              if (autoAdvance) {
                setCurrentStep(2);
              }
            }}
          />
        );
      case 2:
        return (
          <StepProblemDescription
            description={description}
            onDescriptionChange={setDescription}
            photos={photos}
            onPhotosChange={setPhotos}
            address={address}
            onAddressChange={setAddress}
            postalCode={postalCode}
            onPostalCodeChange={setPostalCode}
            city={city}
            onCityChange={setCity}
            additionalInfo={additionalInfo}
            onAdditionalInfoChange={setAdditionalInfo}
          />
        );
      case 3:
        return (
          <StepContactInfo
            email={email}
            onEmailChange={setEmail}
            phone={phone}
            onPhoneChange={setPhone}
          />
        );
      case 4:
        return (
          <StepPayment
            quoteLines={quoteSummary?.lines || []}
            totalHT={quoteSummary?.totalHT || 0}
            vatRate={quoteSummary?.vatRate || 10}
            vatAmount={quoteSummary?.vatAmount || 0}
            totalTTC={quoteSummary?.totalTTC || 0}
            multiplierLabel={multiplierLabel}
            isProcessing={isPaymentProcessing}
            isAuthorized={isPaymentAuthorized}
            clientSecret={clientSecret}
            onInitializePayment={handleInitializePayment}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        );
      case 5:
        return (
          <StepSummary
            category={category!}
            description={description}
            address={address}
            postalCode={postalCode}
            city={city}
            email={email}
            phone={phone}
            photos={photos}
            trackingCode={trackingCode || undefined}
            isSubmitted={isSubmitted}
            quoteLines={quoteSummary?.lines || []}
            totalHT={quoteSummary?.totalHT || 0}
            vatRate={quoteSummary?.vatRate || 10}
            vatAmount={quoteSummary?.vatAmount || 0}
            totalTTC={quoteSummary?.totalTTC || 0}
            isPaymentAuthorized={isPaymentAuthorized}
          />
        );
      default:
        return null;
    }
  };

  // Container styles based on embedded mode
  const containerClass = embedded 
    ? "" 
    : "min-h-screen bg-background";
  
  const innerContainerClass = embedded 
    ? "" 
    : "max-w-2xl mx-auto px-4 py-8";

  return (
    <div className={containerClass}>
      <div className={innerContainerClass}>
        {/* Header - only show back button when not embedded */}
        <div className={embedded ? "mb-6" : "mb-8"}>
          {!embedded && (
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          )}
          
          {!embedded && (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Demande d'intervention</h1>
              {category && currentStep > 1 && (
                <Badge variant="secondary" className="flex items-center gap-2 text-base py-1.5 px-3">
                  {categoryIcons[category]}
                  <span>{CATEGORY_LABELS[category]}</span>
                </Badge>
              )}
            </div>
          )}

          {/* Selected category badge for embedded mode */}
          {embedded && category && currentStep > 1 && (
            <Badge variant="secondary" className="flex items-center gap-2 text-base py-1.5 px-3 w-fit mb-4">
              {categoryIcons[category]}
              <span>{CATEGORY_LABELS[category]}</span>
            </Badge>
          )}
          
          {/* Progress */}
          {!isSubmitted && (
            <div className={embedded ? "" : "mt-6"}>
              <div className="flex justify-between text-sm mb-2">
                {STEPS.map((step) => (
                  <span
                    key={step.id}
                    className={`flex items-center gap-1 ${
                      step.id === currentStep
                        ? 'text-primary font-medium'
                        : step.id < currentStep
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/50'
                    }`}
                  >
                    {step.icon}
                    <span className="hidden sm:inline">{step.title}</span>
                  </span>
                ))}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        {!isSubmitted && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>

            {currentStep < STEPS.length ? (
              currentStep === 4 && !isPaymentAuthorized ? (
                // Payment step - button handled inside StepPayment
                <div />
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isPaymentAuthorized}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Confirmer la demande
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Return home after submission */}
        {isSubmitted && (
          <div className="flex flex-col items-center gap-3 mt-6">
            {user && (
              <Button onClick={() => navigate('/dashboard')} className="w-full max-w-xs">
                Mon espace client
              </Button>
            )}
            <Button variant={user ? "outline" : "default"} onClick={() => navigate('/')} className="w-full max-w-xs">
              Retour à l'accueil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
