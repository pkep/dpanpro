import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { partnersService } from '@/services/partners/partners.service';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, AlertCircle, User, Building2, Wrench, Wallet } from 'lucide-react';
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

const personalSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom est requis').max(50),
  lastName: z.string().trim().min(2, 'Le nom est requis').max(50),
  phone: z.string().trim().regex(/^(\+33|0)[1-9](\d{8})$/, 'Numéro de téléphone invalide'),
  birthDate: z.string().min(1, 'Date de naissance requise'),
  birthPlace: z.string().trim().min(2, 'Lieu de naissance requis').max(100),
  address: z.string().trim().min(5, 'Adresse requise').max(200),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide'),
  city: z.string().trim().min(2, 'Ville requise').max(100),
});

const professionalSchema = z.object({
  companyName: z.string().trim().min(2, 'Nom de l\'entreprise requis').max(100),
  siret: z.string().trim().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres'),
  vatNumber: z.string().optional(),
  legalStatus: z.string().min(1, 'Statut juridique requis'),
  insuranceCompany: z.string().trim().min(2, 'Nom de l\'assurance requis').max(100),
  insurancePolicyNumber: z.string().trim().min(5, 'Numéro de police requis').max(50),
  insuranceExpiryDate: z.string().min(1, 'Date d\'expiration requise'),
  hasDecennialInsurance: z.boolean(),
});

const expertiseSchema = z.object({
  skills: z.array(z.string()).min(1, 'Sélectionnez au moins une compétence'),
  yearsExperience: z.number().min(0).max(50),
  motivation: z.string().trim().min(50, 'Décrivez votre motivation (min 50 caractères)').max(1000),
});

const bankingSchema = z.object({
  bankAccountHolder: z.string().trim().min(2, 'Titulaire du compte requis').max(100),
  bankName: z.string().trim().min(2, 'Nom de la banque requis').max(100),
  iban: z.string().trim().regex(/^FR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3}$|^FR\d{25}$/, 'IBAN français invalide'),
  bic: z.string().trim().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, 'BIC invalide'),
});

type PersonalData = z.infer<typeof personalSchema>;
type ProfessionalData = z.infer<typeof professionalSchema>;
type ExpertiseData = z.infer<typeof expertiseSchema>;
type BankingData = z.infer<typeof bankingSchema>;

const TechnicianProfilePage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('personal');

  const personalForm = useForm<PersonalData>({
    resolver: zodResolver(personalSchema),
  });

  const professionalForm = useForm<ProfessionalData>({
    resolver: zodResolver(professionalSchema),
  });

  const expertiseForm = useForm<ExpertiseData>({
    resolver: zodResolver(expertiseSchema),
  });

  const bankingForm = useForm<BankingData>({
    resolver: zodResolver(bankingSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const profile = await partnersService.getPartnerProfile(user.id);
        if (profile) {
          personalForm.reset({
            firstName: profile.user.firstName,
            lastName: profile.user.lastName,
            phone: profile.user.phone || '',
            birthDate: profile.application.birthDate,
            birthPlace: profile.application.birthPlace,
            address: profile.application.address,
            postalCode: profile.application.postalCode,
            city: profile.application.city,
          });

          professionalForm.reset({
            companyName: profile.application.companyName,
            siret: profile.application.siret,
            vatNumber: profile.application.vatNumber || '',
            legalStatus: profile.application.legalStatus,
            insuranceCompany: profile.application.insuranceCompany,
            insurancePolicyNumber: profile.application.insurancePolicyNumber,
            insuranceExpiryDate: profile.application.insuranceExpiryDate,
            hasDecennialInsurance: profile.application.hasDecennialInsurance,
          });

          expertiseForm.reset({
            skills: profile.application.skills,
            yearsExperience: profile.application.yearsExperience,
            motivation: profile.application.motivation,
          });

          bankingForm.reset({
            bankAccountHolder: profile.application.bankAccountHolder,
            bankName: profile.application.bankName,
            iban: profile.application.iban,
            bic: profile.application.bic,
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Impossible de charger le profil');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handlePersonalSubmit = async (data: PersonalData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await partnersService.updatePartnerProfile(user.id, data);
      toast.success('Informations personnelles mises à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfessionalSubmit = async (data: ProfessionalData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await partnersService.updatePartnerProfile(user.id, data);
      toast.success('Informations professionnelles mises à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpertiseSubmit = async (data: ExpertiseData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await partnersService.updatePartnerProfile(user.id, data);
      toast.success('Expertises mises à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBankingSubmit = async (data: BankingData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await partnersService.updatePartnerProfile(user.id, {
        ...data,
        iban: data.iban.replace(/\s/g, ''),
      });
      toast.success('Coordonnées bancaires mises à jour');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <TechnicianLayout title="Profil" subtitle="Gérez vos informations">
        <Skeleton className="h-[600px] w-full" />
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout title="Profil" subtitle="Gérez vos informations">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personnel</span>
          </TabsTrigger>
          <TabsTrigger value="professional" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Professionnel</span>
          </TabsTrigger>
          <TabsTrigger value="expertise" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Expertises</span>
          </TabsTrigger>
          <TabsTrigger value="banking" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Bancaire</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Vos coordonnées et informations de contact</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...personalForm}>
                <form onSubmit={personalForm.handleSubmit(handlePersonalSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={personalForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={personalForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={personalForm.control}
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
                      control={personalForm.control}
                      name="birthPlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lieu de naissance *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={personalForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={personalForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal *</FormLabel>
                          <FormControl>
                            <Input maxLength={5} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={personalForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card>
            <CardHeader>
              <CardTitle>Informations professionnelles</CardTitle>
              <CardDescription>Détails de votre entreprise et assurances</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...professionalForm}>
                <form onSubmit={professionalForm.handleSubmit(handleProfessionalSubmit)} className="space-y-4">
                  <FormField
                    control={professionalForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'entreprise *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={professionalForm.control}
                      name="siret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SIRET *</FormLabel>
                          <FormControl>
                            <Input maxLength={14} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={professionalForm.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° TVA intracommunautaire</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={professionalForm.control}
                    name="legalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut juridique *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez votre statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={professionalForm.control}
                      name="insuranceCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Compagnie d'assurance *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={professionalForm.control}
                      name="insurancePolicyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° de police *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={professionalForm.control}
                    name="insuranceExpiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'expiration de l'assurance *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={professionalForm.control}
                    name="hasDecennialInsurance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Je dispose d'une assurance décennale
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expertise">
          <Card>
            <CardHeader>
              <CardTitle>Expertises</CardTitle>
              <CardDescription>Vos compétences et expérience</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...expertiseForm}>
                <form onSubmit={expertiseForm.handleSubmit(handleExpertiseSubmit)} className="space-y-4">
                  <FormField
                    control={expertiseForm.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compétences *</FormLabel>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {skills.map((skill) => (
                            <div key={skill.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={skill.value}
                                checked={field.value?.includes(skill.value)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value || []), skill.value]
                                    : field.value?.filter((v) => v !== skill.value) || [];
                                  field.onChange(newValue);
                                }}
                              />
                              <label
                                htmlFor={skill.value}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {skill.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={expertiseForm.control}
                    name="yearsExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Années d'expérience *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={expertiseForm.control}
                    name="motivation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivation *</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées bancaires</CardTitle>
              <CardDescription>Informations pour le versement de vos revenus</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...bankingForm}>
                <form onSubmit={bankingForm.handleSubmit(handleBankingSubmit)} className="space-y-4">
                  <FormField
                    control={bankingForm.control}
                    name="bankAccountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titulaire du compte *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={bankingForm.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de la banque *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={bankingForm.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN *</FormLabel>
                        <FormControl>
                          <Input placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={bankingForm.control}
                    name="bic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BIC / SWIFT *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TechnicianLayout>
  );
};

export default TechnicianProfilePage;
