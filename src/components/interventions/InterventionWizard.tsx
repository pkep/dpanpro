import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { interventionsService } from '@/services/interventions/interventions.service';
import { InterventionCategory, CATEGORY_LABELS } from '@/types/intervention.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Loader2, Send, Key, Wrench, Zap, Grid3X3, Flame, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { StepServiceSelection } from './steps/StepServiceSelection';
import { StepProblemDescription } from './steps/StepProblemDescription';
import { StepContactInfo } from './steps/StepContactInfo';
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
  { id: 1, title: 'Service' },
  { id: 2, title: 'Problème' },
  { id: 3, title: 'Contact' },
  { id: 4, title: 'Validation' },
];

export function InterventionWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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
  }, [searchParams]);

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

  const handleSubmit = async () => {
    if (!category) return;

    setIsSubmitting(true);
    try {
      // Use user ID if authenticated, otherwise use a guest ID
      const clientId = user?.id || 'guest-' + Date.now();

      const intervention = await interventionsService.createIntervention(clientId, {
        category,
        description,
        address,
        city,
        postalCode,
        priority: 'normal',
        clientEmail: email,
        clientPhone: phone,
        photos: photos.length > 0 ? photos : undefined,
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
            onSelect={setCategory}
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Demande d'intervention</h1>
            {category && currentStep > 1 && (
              <Badge variant="secondary" className="flex items-center gap-2 text-base py-1.5 px-3">
                {categoryIcons[category]}
                <span>{CATEGORY_LABELS[category]}</span>
              </Badge>
            )}
          </div>
          
          {/* Progress */}
          {!isSubmitted && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                {STEPS.map((step) => (
                  <span
                    key={step.id}
                    className={
                      step.id === currentStep
                        ? 'text-primary font-medium'
                        : step.id < currentStep
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/50'
                    }
                  >
                    {step.title}
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
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer la demande
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Return home after submission */}
        {isSubmitted && (
          <div className="flex justify-center mt-6">
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
