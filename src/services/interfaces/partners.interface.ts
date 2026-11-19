/** partner_applications.status — mirror of gateway Technician.ApplicationStatus */
export type TechnicianApplicationStatus = 'pending' | 'qualification' | 'approved' | 'suspended' | 'rejected' | 'inactive';

export interface PendingApplicationWithUser {
  id: string;
  user_id: string;
  company_name: string;
  siren: string;
  vatNumber?: string | null;
  legal_status: string;
  skills: string[];
  certifications?: string[] | null;
  years_experience: number;
  zones?: string[] | null;
  created_at: string;
  validated_at?: string | null;
  status?: TechnicianApplicationStatus;
  rejection_reason?: string | null;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
    photo_quality_ok?: boolean | null;
    last_login_at?: string | null;
    last_seen_at?: string | null;
  };
}

/** Technicien en qualification (onglet admin "Qualification"). */
export interface QualificationTechnician extends PendingApplicationWithUser {
  /** Champs manquants (obligatoires + facultatifs + 'photoQuality'). */
  missingProfileFields: string[];
  /** true ⇒ l'icône "Valider" est affichable (tous les champs requis + photo OK). */
  readyForValidation: boolean;
}

export interface QualificationListResult {
  content: QualificationTechnician[];
  total: number;
  readyCount: number;
}

export interface TechnicianStatusCounts {
  pending: number;
  qualification: number;
  active: number;
}

export interface PartnerApplicationData {
  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string;
  birthPlace?: string;
  address: string;
  postalCode: string;
  city: string;
  password?: string;

  // Professional info
  companyName: string;
  siren: string;
  apeCode?: string;
  /** Numéro de TVA intracommunautaire (facultatif). */
  vatNumber?: string | null;
  legalStatus: string;
  vehicleTypes: string[];
  zones: string[];
  certifications: string[];

  // Insurance
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  hasDecennialInsurance?: boolean;

  // Expertise
  skills: string[];
  yearsExperience: number;
  presentation: string;
  availability: string[];

  // Banking
  bankAccountHolder?: string;
  bankName?: string;
  iban?: string;
  bic?: string;

  // Agreements
  termsAccepted: boolean;
  dataAccuracyConfirmed: boolean;
}

export interface IPartnersService {
  submitApplication(data: PartnerApplicationData): Promise<void>;
  getPartnerProfile(userId: string): Promise<{
    user: { firstName: string; lastName: string; email: string; phone: string | null };
    application: {
      birthDate: string; birthPlace: string; address: string; postalCode: string; city: string;
      companyName: string; siren: string; apeCode: string | null; legalStatus: string; vatNumber: string | null;
      insuranceCompany: string; insurancePolicyNumber: string; insuranceExpiryDate: string;
      hasDecennialInsurance: boolean; skills: string[]; yearsExperience: number; presentation: string;
      bankAccountHolder: string; bankName: string; iban: string; bic: string;
    };
  } | null>;
  updatePartnerProfile(userId: string, data: Record<string, unknown>): Promise<void>;

  // ── Load partner application data sections ──
  loadPartnerApplicationData(userId: string): Promise<{
    siren: string;
    company_name: string;
    legal_status: string;
    ape_code: string | null;
    vat_number: string | null;
    address: string;
    city: string;
    postal_code: string;
  } | null>;

  loadExpertiseData(userId: string): Promise<{
    skills: string[];
    years_experience: number;
    current_city: string | null;
  } | null>;

  loadBankingData(userId: string): Promise<{
    iban: string;
    bic: string;
    bank_name: string;
    bank_account_holder: string;
  } | null>;

  // ── Partner application and stats (Admin) ──
  getPartnerApplication(userId: string): Promise<{
    id: string;
    company_name: string;
    siren: string;
    ape_code: string | null;
    vat_number: string | null;
    legal_status: string;
    address: string;
    postal_code: string;
    city: string;
    skills: string[];
    years_experience: number;
    insurance_company: string;
    insurance_policy_number: string;
    insurance_expiry_date: string;
    has_decennial_insurance: boolean;
    bank_name: string;
    bank_account_holder: string;
    iban: string;
    bic: string;
    birth_date: string;
    birth_place: string;
vehicle_types?: string[];
    certifications?: string[];
    zones?: string[] | null;
    validated_at?: string | null;
    status?: TechnicianApplicationStatus;
    rejection_reason?: string | null;
  } | null>;

  getPartnerStats(userId: string): Promise<{
    average_rating: number | null;
    completed_interventions: number;
    total_interventions: number;
  } | null>;

  // ── Admin: Get pending applications (with embedded user info) ──
  getPendingApplications(): Promise<PendingApplicationWithUser[]>;

  // ── Admin: Qualify/Reject applications ──
  /** pending|qualification → rejected (+ désactivation du compte). */
  rejectApplication(applicationId: string, reason?: string): Promise<void>;
  /** pending → qualification (profil à compléter, non dispatchable). */
  qualifyApplication(applicationId: string, userAdminId: string): Promise<void>;
  /**
   * qualification → approved. Le serveur re-vérifie la complétude.
   * Rejette avec { code: 'PROFILE_INCOMPLETE', missingFields } ou { code: 'INVALID_STATUS' }.
   */
  approveApplication(applicationId: string): Promise<void>;

  // ── Admin: Qualification tab ──
  getQualificationApplications(params: { search?: string; page: number; limit: number }): Promise<QualificationListResult>;
  getTechnicianStatusCounts(): Promise<TechnicianStatusCounts>;
}
