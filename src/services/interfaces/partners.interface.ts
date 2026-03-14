export interface PartnerApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  postalCode: string;
  city: string;
  password: string;
  companyName: string;
  siret: string;
  vatNumber?: string;
  legalStatus: string;
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  hasDecennialInsurance: boolean;
  kbisUrl?: string;
  skills: string[];
  yearsExperience: number;
  motivation: string;
  bankAccountHolder: string;
  bankName: string;
  iban: string;
  bic: string;
  termsAccepted: boolean;
  dataAccuracyConfirmed: boolean;
}

export interface IPartnersService {
  submitApplication(data: PartnerApplicationData): Promise<void>;
  getPartnerProfile(userId: string): Promise<{
    user: { firstName: string; lastName: string; email: string; phone: string | null };
    application: {
      birthDate: string; birthPlace: string; address: string; postalCode: string; city: string;
      companyName: string; siret: string; vatNumber: string | null; legalStatus: string;
      insuranceCompany: string; insurancePolicyNumber: string; insuranceExpiryDate: string;
      hasDecennialInsurance: boolean; skills: string[]; yearsExperience: number; motivation: string;
      bankAccountHolder: string; bankName: string; iban: string; bic: string;
    };
  } | null>;
  updatePartnerProfile(userId: string, data: Record<string, unknown>): Promise<void>;
}
