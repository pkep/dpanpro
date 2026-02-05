import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { partnersService } from '@/services/partners/partners.service';
import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const skills = [
  { value: 'locksmith', label: 'Serrurerie' },
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electricity', label: 'Électricité' },
  { value: 'glazing', label: 'Vitrerie' },
  { value: 'heating', label: 'Chauffage' },
  { value: 'aircon', label: 'Climatisation' },
];

const legalStatuses = [
  'Auto-entrepreneur',
  'EURL',
  'SARL',
  'SAS',
  'SASU',
  'Entreprise individuelle',
];

// Step 1: Personal info
const step1Schema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom est requis').max(50),
  lastName: z.string().trim().min(2, 'Le nom est requis').max(50),
  email: z.string().trim().email('Email invalide'),
  phone: z.string().trim().regex(/^(\+33|0)[1-9](\d{8})$/, 'Numéro de téléphone invalide'),
  birthDate: z.string().min(1, 'Date de naissance requise'),
  birthPlace: z.string().trim().min(2, 'Lieu de naissance requis').max(100),
  address: z.string().trim().min(5, 'Adresse requise').max(200),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide'),
  city: z.string().trim().min(2, 'Ville requise').max(100),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// Step 2: Professional info
const step2Schema = z.object({
  companyName: z.string().trim().min(2, 'Nom de l\'entreprise requis').max(100),
  siret: z.string().trim().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
  vatNumber: z.string().optional(),
  legalStatus: z.string().min(1, 'Statut juridique requis'),
  insuranceCompany: z.string().trim().min(2, 'Nom de l\'assurance requis').max(100),
  insurancePolicyNumber: z.string().trim().min(5, 'Numéro de police requis').max(50),
  insuranceExpiryDate: z.string().min(1, 'Date d\'expiration requise'),
  hasDecennialInsurance: z.boolean(),
});

// Step 3: Expertise
const step3Schema = z.object({
  skills: z.array(z.string()).min(1, 'Sélectionnez au moins une compétence'),
  yearsExperience: z.number().min(0).max(50),
  motivation: z.string().trim().min(50, 'Décrivez votre motivation (min 50 caractères)').max(1000),
});

// Step 4: Banking
const step4Schema = z.object({
  bankAccountHolder: z.string().trim().min(2, 'Titulaire du compte requis').max(100),
  bankName: z.string().trim().min(2, 'Nom de la banque requis').max(100),
  iban: z.string().trim().regex(/^FR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3}$|^FR\d{25}$/, 'IBAN français invalide'),
  bic: z.string().trim().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC invalide'),
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions'),
  dataAccuracyConfirmed: z.boolean().refine(val => val === true, 'Vous devez attester l\'exactitude des données'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

const JoinPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: step1Data || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      birthDate: '',
      birthPlace: '',
      address: '',
      postalCode: '',
      city: '',
      password: '',
      confirmPassword: '',
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: step2Data || {
      companyName: '',
      siret: '',
      vatNumber: '',
      legalStatus: '',
      insuranceCompany: '',
      insurancePolicyNumber: '',
      insuranceExpiryDate: '',
      hasDecennialInsurance: false,
    },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: step3Data || {
      skills: [],
      yearsExperience: 0,
      motivation: '',
    },
  });

  const step4Form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      bankAccountHolder: '',
      bankName: '',
      iban: '',
      bic: '',
      termsAccepted: false,
      dataAccuracyConfirmed: false,
    },
  });

  const handleStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep3Submit = (data: Step3Data) => {
    setStep3Data(data);
    setCurrentStep(4);
  };

  const handleStep4Submit = async (data: Step4Data) => {
    if (!step1Data || !step2Data || !step3Data) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await partnersService.submitApplication({
        firstName: step1Data.firstName,
        lastName: step1Data.lastName,
        email: step1Data.email,
        phone: step1Data.phone,
        birthDate: step1Data.birthDate,
        birthPlace: step1Data.birthPlace,
        address: step1Data.address,
        postalCode: step1Data.postalCode,
        city: step1Data.city,
        password: step1Data.password,
        companyName: step2Data.companyName,
        siret: step2Data.siret,
        vatNumber: step2Data.vatNumber,
        legalStatus: step2Data.legalStatus,
        insuranceCompany: step2Data.insuranceCompany,
        insurancePolicyNumber: step2Data.insurancePolicyNumber,
        insuranceExpiryDate: step2Data.insuranceExpiryDate,
        hasDecennialInsurance: step2Data.hasDecennialInsurance,
        skills: step3Data.skills,
        yearsExperience: step3Data.yearsExperience,
        motivation: step3Data.motivation,
        bankAccountHolder: data.bankAccountHolder,
        bankName: data.bankName,
        iban: data.iban.replace(/\s/g, ''),
        bic: data.bic,
        termsAccepted: data.termsAccepted,
        dataAccuracyConfirmed: data.dataAccuracyConfirmed,
      });

      toast.success('Candidature envoyée avec succès !');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    'Informations personnelles',
    'Informations professionnelles',
    'Expertises',
    'Coordonnées bancaires',
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/30 py-12">
        <div className="container mx-auto max-w-2xl px-4">
          {/* Progress */}
          <div className="mb-6 sm:mb-8">
            <div className="mb-3 sm:mb-4 flex justify-between text-sm">
              {stepTitles.map((title, i) => (
                <div
                  key={i}
                  className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 ${
                    i + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-medium shrink-0 ${
                      i + 1 < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : i + 1 === currentStep
                        ? 'border-2 border-primary text-primary'
                        : 'border-2 border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {i + 1 < currentStep ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline text-xs">{title}</span>
                </div>
              ))}
            </div>
            <Progress value={(currentStep / 4) * 100} className="h-2" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Devenir partenaire Dépan.Pro</CardTitle>
              <CardDescription>
                Étape {currentStep} sur 4 : {stepTitles[currentStep - 1]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Personal Info */}
              {currentStep === 1 && (
                <Form {...step1Form}>
                  <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step1Form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom *</FormLabel>
                            <FormControl>
                              <Input placeholder="Jean" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom *</FormLabel>
                            <FormControl>
                              <Input placeholder="Dupont" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step1Form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="jean@exemple.fr" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Téléphone *</FormLabel>
                            <FormControl>
                              <Input placeholder="0612345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step1Form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date de naissance *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="birthPlace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lieu de naissance *</FormLabel>
                            <FormControl>
                              <Input placeholder="Paris" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={step1Form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 rue de la Paix" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step1Form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code postal *</FormLabel>
                            <FormControl>
                              <Input placeholder="75001" maxLength={5} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ville *</FormLabel>
                            <FormControl>
                              <Input placeholder="Paris" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step1Form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmer le mot de passe *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit">
                        Suivant
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 2: Professional Info */}
              {currentStep === 2 && (
                <Form {...step2Form}>
                  <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
                    <h3 className="font-medium text-foreground">Entreprise</h3>
                    
                    <FormField
                      control={step2Form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de l'entreprise *</FormLabel>
                          <FormControl>
                            <Input placeholder="Dépannage Express SARL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step2Form.control}
                        name="siret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SIRET *</FormLabel>
                            <FormControl>
                              <Input placeholder="12345678901234" maxLength={14} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step2Form.control}
                        name="vatNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro de TVA (optionnel)</FormLabel>
                            <FormControl>
                              <Input placeholder="FR12345678901" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={step2Form.control}
                      name="legalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut juridique *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un statut" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {legalStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <h3 className="mt-6 font-medium text-foreground">Assurance professionnelle</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={step2Form.control}
                        name="insuranceCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compagnie d'assurance *</FormLabel>
                            <FormControl>
                              <Input placeholder="AXA Pro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step2Form.control}
                        name="insurancePolicyNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro de police *</FormLabel>
                            <FormControl>
                              <Input placeholder="POL-123456" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={step2Form.control}
                      name="insuranceExpiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'expiration *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="hasDecennialInsurance"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">
                            Je dispose d'une assurance décennale
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Précédent
                      </Button>
                      <Button type="submit">
                        Suivant
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 3: Expertise */}
              {currentStep === 3 && (
                <Form {...step3Form}>
                  <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
                    <FormField
                      control={step3Form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Compétences *</FormLabel>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {skills.map((skill) => (
                              <div key={skill.value} className="flex items-center gap-2">
                                <Checkbox
                                  checked={field.value.includes(skill.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...field.value, skill.value]);
                                    } else {
                                      field.onChange(field.value.filter((v) => v !== skill.value));
                                    }
                                  }}
                                />
                                <span className="text-sm">{skill.label}</span>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step3Form.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Années d'expérience *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step3Form.control}
                      name="motivation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivation *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Décrivez pourquoi vous souhaitez rejoindre Dépan.Pro..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Précédent
                      </Button>
                      <Button type="submit">
                        Suivant
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Step 4: Banking */}
              {currentStep === 4 && (
                <Form {...step4Form}>
                  <form onSubmit={step4Form.handleSubmit(handleStep4Submit)} className="space-y-4">
                    <FormField
                      control={step4Form.control}
                      name="bankAccountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titulaire du compte *</FormLabel>
                          <FormControl>
                            <Input placeholder="Jean Dupont" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step4Form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banque *</FormLabel>
                          <FormControl>
                            <Input placeholder="Crédit Agricole" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step4Form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IBAN *</FormLabel>
                          <FormControl>
                            <Input placeholder="FR76 1234 5678 9012 3456 7890 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step4Form.control}
                      name="bic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BIC / SWIFT *</FormLabel>
                          <FormControl>
                            <Input placeholder="AGRIFRPP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                      <FormField
                        control={step4Form.control}
                        name="termsAccepted"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 text-sm">
                              J'accepte les conditions générales d'utilisation et la politique de confidentialité *
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step4Form.control}
                        name="dataAccuracyConfirmed"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 text-sm">
                              J'atteste que les informations fournies sont exactes et complètes *
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Précédent
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            Envoyer ma candidature
                            <Check className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JoinPage;
