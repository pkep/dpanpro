import { supabase } from '@/integrations/supabase/client';

export interface PartnerApplicationData {
  // Personal info
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
  
  // Professional info
  companyName: string;
  siret: string;
  vatNumber?: string;
  legalStatus: string;
  
  // Insurance
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  hasDecennialInsurance: boolean;
  
  // Expertise
  skills: string[];
  yearsExperience: number;
  motivation: string;
  
  // Banking
  bankAccountHolder: string;
  bankName: string;
  iban: string;
  bic: string;
  
  // Agreements
  termsAccepted: boolean;
  dataAccuracyConfirmed: boolean;
}

class PartnersService {
  async submitApplication(data: PartnerApplicationData): Promise<void> {
    // Hash password using edge function
    const hashResponse = await supabase.functions.invoke('hash-password', {
      body: { password: data.password },
    });

    if (hashResponse.error) {
      throw new Error('Erreur lors du traitement du mot de passe');
    }

    const passwordHash = hashResponse.data.hash;

    const { error } = await (supabase
      .from('partner_applications') as any)
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        birth_date: data.birthDate,
        birth_place: data.birthPlace,
        address: data.address,
        postal_code: data.postalCode,
        city: data.city,
        password_hash: passwordHash,
        company_name: data.companyName,
        siret: data.siret,
        vat_number: data.vatNumber || null,
        legal_status: data.legalStatus,
        insurance_company: data.insuranceCompany,
        insurance_policy_number: data.insurancePolicyNumber,
        insurance_expiry_date: data.insuranceExpiryDate,
        has_decennial_insurance: data.hasDecennialInsurance,
        skills: data.skills,
        years_experience: data.yearsExperience,
        motivation: data.motivation,
        bank_account_holder: data.bankAccountHolder,
        bank_name: data.bankName,
        iban: data.iban,
        bic: data.bic,
        terms_accepted: data.termsAccepted,
        data_accuracy_confirmed: data.dataAccuracyConfirmed,
      } as Record<string, unknown>);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Cette adresse email est déjà utilisée');
      }
      throw error;
    }
  }
}

export const partnersService = new PartnersService();
