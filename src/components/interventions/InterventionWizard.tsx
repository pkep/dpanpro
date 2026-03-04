import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { dispatchService } from '@/services/dispatch/dispatch.service';
import { servicesService, Service } from '@/services/services/services.service';
import { InterventionCategory, CATEGORY_LABELS } from '@/types/intervention.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Loader2, Send, Key, Wrench, Zap, Grid3X3, Flame, Snowflake, Settings, MessageSquare, User, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StepServiceSelection } from './steps/StepServiceSelection';
import { StepQuestionnaire } from './steps/StepQuestionnaire';
import { StepContactInfo } from './steps/StepContactInfo';
import { StepSummary } from './steps/StepSummary';
import type { QuestionnaireResult } from '@/data/questionnaire-tree';

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
  { id: 2, title: 'Diagnostic', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 3, title: 'Contact', icon: <User className="h-4 w-4" /> },
  { id: 4, title: 'Validation', icon: <CheckCircle className="h-4 w-4" /> },
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
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  // Questionnaire result
  const [questionnaireResult, setQuestionnaireResult] = useState<QuestionnaireResult | null>(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<string[]>([]);

  const [services, setServices] = useState<Service[]>([]);

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
        setCurrentStep(2);
      }
    }
  }, [searchParams]);

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return category !== null;
      case 2:
        return questionnaireResult !== null;
      case 3:
        const baseValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
               phone.trim().length >= 10 &&
               address.trim().length >= 5 && 
               /^\d{5}$/.test(postalCode) && 
               city.trim().length >= 2;
        if (!user && !isGuest) {
          return baseValid && password.length >= 6 && password === confirmPassword;
        }
        return baseValid;
      case 4:
        return true;
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

  const handleQuestionnaireResult = (result: QuestionnaireResult, answers: string[]) => {
    setQuestionnaireResult(result);
    setQuestionnaireAnswers(answers);
  };

  const handleSubmit = async () => {
    if (!category || !questionnaireResult) {
      toast.error('Veuillez compléter le questionnaire');
      return;
    }

    setIsSubmitting(true);
    try {
      const clientId = user?.id || null;

      // Parse prix_min/prix_max from result
      const priceMatch = questionnaireResult.prix.match(/(\d+)\s*[–-]\s*(\d+)/);
      const prixMin = priceMatch ? parseFloat(priceMatch[1]) : null;
      const prixMax = priceMatch ? parseFloat(priceMatch[2]) : null;

      const intervention = await interventionsService.createIntervention(clientId, {
        category,
        description: `${questionnaireResult.nom}${description ? `\n\n${description}` : ''}`,
        address,
        city,
        postalCode,
        priority: 'normal',
        clientEmail: email,
        clientPhone: phone,
        photos: photos.length > 0 ? photos : undefined,
      }, {
        questionnaireAnswers,
        questionnaireResultName: questionnaireResult.nom,
        prixMin,
        prixMax,
      });

      setTrackingCode(intervention.trackingCode || null);
      setIsSubmitted(true);
      toast.success('Demande envoyée avec succès !');
    } catch (error) {
      console.error('Error creating intervention:', error);
      toast.error('Erreur lors de la création de la demande');
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
              // Reset questionnaire when changing category
              setQuestionnaireResult(null);
              setQuestionnaireAnswers([]);
              if (autoAdvance) {
                setCurrentStep(2);
              }
            }}
          />
        );
      case 2:
        return category ? (
          <StepQuestionnaire
            category={category}
            onResult={handleQuestionnaireResult}
            selectedResult={questionnaireResult}
            description={description}
            onDescriptionChange={setDescription}
            photos={photos}
            onPhotosChange={setPhotos}
          />
        ) : null;
      case 3:
        return (
          <StepContactInfo
            email={email}
            onEmailChange={setEmail}
            phone={phone}
            onPhoneChange={setPhone}
            address={address}
            onAddressChange={setAddress}
            postalCode={postalCode}
            onPostalCodeChange={setPostalCode}
            city={city}
            onCityChange={setCity}
            additionalInfo={additionalInfo}
            onAdditionalInfoChange={setAdditionalInfo}
            password={password}
            onPasswordChange={setPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            isGuest={isGuest}
            onIsGuestChange={setIsGuest}
          />
        );
      case 4:
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
            questionnaireResult={questionnaireResult}
            questionnaireAnswers={questionnaireAnswers}
          />
        );
      default:
        return null;
    }
  };

  const containerClass = embedded ? "" : "min-h-screen bg-background";
  const innerContainerClass = embedded ? "" : "max-w-2xl mx-auto px-4 py-8";

  return (
    <div className={containerClass}>
      <div className={innerContainerClass}>
        {/* Header */}
        <div className={embedded ? "mb-6" : "mb-8"}>
          {!embedded && (
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
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

          {embedded && category && currentStep > 1 && (
            <Badge variant="secondary" className="flex items-center gap-2 text-base py-1.5 px-3 w-fit mb-4">
              {categoryIcons[category]}
              <span>{CATEGORY_LABELS[category]}</span>
            </Badge>
          )}
          
          {/* Progress */}
          {!isSubmitted && (
            <div className={embedded ? "" : "mt-6"}>
              <div className="flex justify-between items-center mb-2">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center gap-1 ${
                      step.id === currentStep
                        ? 'text-primary font-medium'
                        : step.id < currentStep
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/50'
                    }`}
                  >
                    {step.icon}
                    <span className="text-xs hidden sm:inline">{step.title}</span>
                  </div>
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
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
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
