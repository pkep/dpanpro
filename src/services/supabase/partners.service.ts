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

  async getPartnerProfile(userId: string): Promise<{
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
    application: {
      birthDate: string;
      birthPlace: string;
      address: string;
      postalCode: string;
      city: string;
      companyName: string;
      siret: string;
      vatNumber: string | null;
      legalStatus: string;
      insuranceCompany: string;
      insurancePolicyNumber: string;
      insuranceExpiryDate: string;
      hasDecennialInsurance: boolean;
      skills: string[];
      yearsExperience: number;
      motivation: string;
      bankAccountHolder: string;
      bankName: string;
      iban: string;
      bic: string;
    };
  } | null> {
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', userId)
      .single();

    if (userError || !userData) return null;

    // Get partner application data
    const { data: appData, error: appError } = await supabase
      .from('partner_applications')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (appError || !appData) return null;

    return {
      user: {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        phone: userData.phone,
      },
      application: {
        birthDate: appData.birth_date,
        birthPlace: appData.birth_place,
        address: appData.address,
        postalCode: appData.postal_code,
        city: appData.city,
        companyName: appData.company_name,
        siret: appData.siret,
        vatNumber: appData.vat_number,
        legalStatus: appData.legal_status,
        insuranceCompany: appData.insurance_company,
        insurancePolicyNumber: appData.insurance_policy_number,
        insuranceExpiryDate: appData.insurance_expiry_date,
        hasDecennialInsurance: appData.has_decennial_insurance,
        skills: appData.skills,
        yearsExperience: appData.years_experience,
        motivation: appData.motivation,
        bankAccountHolder: appData.bank_account_holder,
        bankName: appData.bank_name,
        iban: appData.iban,
        bic: appData.bic,
      },
    };
  }

  async updatePartnerProfile(
    userId: string,
    data: {
      // User data
      firstName?: string;
      lastName?: string;
      phone?: string;
      // Application data
      birthDate?: string;
      birthPlace?: string;
      address?: string;
      postalCode?: string;
      city?: string;
      companyName?: string;
      siret?: string;
      vatNumber?: string;
      legalStatus?: string;
      insuranceCompany?: string;
      insurancePolicyNumber?: string;
      insuranceExpiryDate?: string;
      hasDecennialInsurance?: boolean;
      skills?: string[];
      yearsExperience?: number;
      motivation?: string;
      bankAccountHolder?: string;
      bankName?: string;
      iban?: string;
      bic?: string;
    }
  ): Promise<void> {
    // Update user table
    const userUpdates: Record<string, unknown> = {};
    if (data.firstName) userUpdates.first_name = data.firstName;
    if (data.lastName) userUpdates.last_name = data.lastName;
    if (data.phone !== undefined) userUpdates.phone = data.phone;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId);

      if (userError) throw userError;
    }

    // Update partner_applications table
    const appUpdates: Record<string, unknown> = {};
    if (data.birthDate) appUpdates.birth_date = data.birthDate;
    if (data.birthPlace) appUpdates.birth_place = data.birthPlace;
    if (data.address) appUpdates.address = data.address;
    if (data.postalCode) appUpdates.postal_code = data.postalCode;
    if (data.city) appUpdates.city = data.city;
    if (data.companyName) appUpdates.company_name = data.companyName;
    if (data.siret) appUpdates.siret = data.siret;
    if (data.vatNumber !== undefined) appUpdates.vat_number = data.vatNumber || null;
    if (data.legalStatus) appUpdates.legal_status = data.legalStatus;
    if (data.insuranceCompany) appUpdates.insurance_company = data.insuranceCompany;
    if (data.insurancePolicyNumber) appUpdates.insurance_policy_number = data.insurancePolicyNumber;
    if (data.insuranceExpiryDate) appUpdates.insurance_expiry_date = data.insuranceExpiryDate;
    if (data.hasDecennialInsurance !== undefined) appUpdates.has_decennial_insurance = data.hasDecennialInsurance;
    if (data.skills) appUpdates.skills = data.skills;
    if (data.yearsExperience !== undefined) appUpdates.years_experience = data.yearsExperience;
    if (data.motivation) appUpdates.motivation = data.motivation;
    if (data.bankAccountHolder) appUpdates.bank_account_holder = data.bankAccountHolder;
    if (data.bankName) appUpdates.bank_name = data.bankName;
    if (data.iban) appUpdates.iban = data.iban;
    if (data.bic) appUpdates.bic = data.bic;

    if (Object.keys(appUpdates).length > 0) {
      const { error: appError } = await supabase
        .from('partner_applications')
        .update(appUpdates)
        .eq('user_id', userId);

      if (appError) throw appError;
    }
  }
}

export const partnersService = new PartnersService();
