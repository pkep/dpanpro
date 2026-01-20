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

    // First, create the user with role 'technician' and is_active = false
    const { data: newUser, error: userError } = await (supabase
      .from('users') as any)
      .insert({
        email: data.email,
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        role: 'technician',
        is_active: false, // Will be activated when manager approves the application
      })
      .select('id')
      .single();

    if (userError) {
      if (userError.code === '23505') {
        throw new Error('Cette adresse email est déjà utilisée');
      }
      throw userError;
    }

    // Then create the partner application linked to the user
    const { error: applicationError } = await (supabase
      .from('partner_applications') as any)
      .insert({
        user_id: newUser.id,
        birth_date: data.birthDate,
        birth_place: data.birthPlace,
        address: data.address,
        postal_code: data.postalCode,
        city: data.city,
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

    if (applicationError) {
      // If application creation fails, we should delete the user we just created
      await (supabase.from('users') as any).delete().eq('id', newUser.id);
      throw applicationError;
    }
  }
}

export const partnersService = new PartnersService();
