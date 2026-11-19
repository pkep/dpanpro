import type {
  IPartnersService,
  PartnerApplicationData,
  PendingApplicationWithUser,
  QualificationListResult,
  QualificationTechnician,
  TechnicianStatusCounts,
  TechnicianApplicationStatus,
} from '@/services/interfaces/partners.interface';
import { springHttp } from './http-client';
import { QualificationError } from '@/services/errors/qualification.error';
import { normalizeZones } from '@/lib/zones';

/** Map a TechnicianResponse (gateway) to the admin list shape. */
function mapTechnicianResponse(tech: any): PendingApplicationWithUser {
  return {
    id: tech.id || '',
    user_id: tech.userId || '',
    company_name: tech.companyName || '',
    siren: tech.siren || '',
    vatNumber: tech.vatNumber || null,
    legal_status: tech.legalStatus || '',
    skills: tech.skills || tech.specializations || [],
    certifications: (tech.certifications || []) as string[],
    years_experience: tech.yearsExperience || 0,
    zones: normalizeZones(tech.zone),
    created_at: tech.createdAt || new Date().toISOString(),
    validated_at: tech.validatedAt || null,
    status: tech.status || undefined,
    rejection_reason: tech.rejectionReason ?? null,
    user: {
      first_name: tech.firstName || '',
      last_name: tech.lastName || '',
      email: tech.email || '',
      phone: tech.phone || null,
      avatar_url: tech.avatarUrl ?? null,
      is_active: tech.userActive ?? undefined,
      photo_quality_ok: tech.photoQualityOk ?? null,
      last_login_at: tech.lastLoginAt ?? null,
      last_seen_at: tech.lastSeenAt ?? null,
    },
  };
}

/**
 * Spring Backend Partners Service
 * ✅ Uses TechnicianApplicationController endpoints
 *
 * Endpoints:
 * - POST   /technicians - submitApplication
 * - GET    /technicians/{userId} - getPartnerProfile
 * - PATCH  /technicians/{userId} - updatePartnerProfile
 * - GET    /technicians?status=pending - getPendingApplications
 * - POST   /technicians/{id}/qualification - qualifyApplication
 * - POST   /technicians/{id}/qualification/validate - approveApplication
 * - POST   /technicians/{id}/reject - rejectApplication
 * - GET    /technicians/admin - getTechniciansAdmin (with stats)
 */
export class SpringPartnersService implements IPartnersService {
  /**
   * Submit new technician application
   * POST /technicians
   */
  async submitApplication(data: PartnerApplicationData): Promise<void> {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: data.password || '',
      company: data.companyName === 'true',
      companyName: data.companyName,
      siren: data.siren,
      apeCode: data.apeCode,
      vatNumber: data.vatNumber ?? null,
      legalStatus: data.legalStatus,
      vehicleTypes: data.vehicleTypes,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      zone: normalizeZones(data.zones),
      skills: data.skills || [],
      certifications: data.certifications || [],
      yearsExperience: data.yearsExperience,
      presentation: data.presentation ?? data.motivation ?? null,
      kbisUrl: data.kbisUrl ?? null,
      birthDate: data.birthDate,
      birthPlace: data.birthPlace,
      insuranceCompany: data.insuranceCompany,
      insurancePolicyNumber: data.insurancePolicyNumber,
      insuranceExpiryDate: data.insuranceExpiryDate,
      hasDecennialInsurance: data.hasDecennialInsurance,
      bankAccountHolder: data.bankAccountHolder,
      bankName: data.bankName,
      iban: data.iban,
      bic: data.bic,
      termsAccepted: data.termsAccepted,
      dataAccuracyConfirmed: data.dataAccuracyConfirmed,
    };

    await springHttp.post('/technicians', payload);
  }

  /**
   * Get full partner profile (user + application data)
   * GET /technicians/{userId}
   */
  async getPartnerProfile(
    userId: string
  ): Promise<{
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
      siren: string;
      apeCode: string | null;
      vatNumber: string | null;
      legalStatus: string;
      insuranceCompany: string;
      insurancePolicyNumber: string;
      insuranceExpiryDate: string;
      hasDecennialInsurance: boolean;
      skills: string[];
      yearsExperience: number;
      presentation: string;
      motivation: string;
      bankAccountHolder: string;
      bankName: string;
      iban: string;
      bic: string;
    };
  } | null> {
    try {
      const response = await springHttp.get<any>(`/technicians/${userId}`);

      // Extract from TechnicianResponse (already unwrapped by springHttp)
      if (!response) return null;

      const tech = response;

      return {
        user: {
          firstName: tech.firstName || '',
          lastName: tech.lastName || '',
          email: tech.email || '',
          phone: tech.phone || null,
        },
        application: {
          birthDate: tech.birthDate || '',
          birthPlace: tech.birthPlace || '',
          address: tech.address || '',
          postalCode: tech.postalCode || '',
          city: tech.currentCity || tech.city || '',
          companyName: tech.companyName || '',
          siren: tech.siren || '',
          apeCode: tech.apeCode || null,
          vatNumber: tech.vatNumber || null,
          legalStatus: tech.legalStatus || '',
          insuranceCompany: tech.insuranceCompany || '',
          insurancePolicyNumber: tech.insurancePolicyNumber || '',
          insuranceExpiryDate: tech.insuranceExpiryDate || '',
          hasDecennialInsurance: tech.hasDecennialInsurance || false,
          skills: tech.specializations || [],
          yearsExperience: tech.yearsExperience || 0,
          presentation: tech.presentation || '',
          motivation: tech.presentation || '',
          bankAccountHolder: tech.bankAccountHolder || '',
          bankName: tech.bankName || '',
          iban: tech.iban || '',
          bic: tech.bic || '',
        },
      };
    } catch (error) {
      console.error('Error fetching partner profile:', error);
      return null;
    }
  }

  /**
   * Update partner profile (user + application data)
   * PATCH /technicians/{userId}
   */
  async updatePartnerProfile(userId: string, data: Record<string, unknown>): Promise<void> {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      companyName: data.companyName,
      siren: data.siren,
      apeCode: data.apeCode,
      vatNumber: data.vatNumber ?? null,
      legalStatus: data.legalStatus,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      zone: normalizeZones(data.zones),
      skills: data.skills,
      certifications: data.certifications || [],
      presentation: data.presentation,
      yearsExperience: data.yearsExperience,
      insuranceCompany: data.insuranceCompany,
      insurancePolicyNumber: data.insurancePolicyNumber,
      insuranceExpiryDate: data.insuranceExpiryDate,
      hasDecennialInsurance: data.hasDecennialInsurance,
      latitude: data.latitude,
      longitude: data.longitude,
      currentCity: data.currentCity || data.city,
      department: data.department,
      // ...existing code...
      ...data,
    };

    await springHttp.patch(`/technicians/${userId}`, payload);
  }

  /**
   * Load partner application data section (company info)
   * GET /technicians/{userId}
   */
  async loadPartnerApplicationData(
    userId: string
  ): Promise<{
    siren: string;
    company_name: string;
    legal_status: string;
    ape_code: string | null;
    vat_number: string | null;
    address: string;
    city: string;
    postal_code: string;
  } | null> {
    try {
      const response = await springHttp.get<any>(`/technicians/${userId}`);
      const tech = response;

      if (!tech) return null;

      return {
        siren: tech.siren || '',
        company_name: tech.companyName || '',
        legal_status: tech.legalStatus || '',
        ape_code: tech.apeCode || null,
        vat_number: tech.vatNumber || null,
        address: tech.address || '',
        city: tech.currentCity || tech.city || '',
        postal_code: tech.postalCode || '',
      };
    } catch (error) {
      console.error('Error loading partner application data:', error);
      return null;
    }
  }

  /**
   * Load expertise data section (skills, experience)
   * GET /technicians/{userId}
   */
  async loadExpertiseData(
    userId: string
  ): Promise<{
    skills: string[];
    years_experience: number;
    current_city: string | null;
  } | null> {
    try {
      const response = await springHttp.get<any>(`/technicians/${userId}`);
      const tech = response;

      if (!tech) return null;

      return {
        skills: tech.specializations || [],
        years_experience: tech.yearsExperience || 0,
        current_city: tech.currentCity || tech.city || null,
      };
    } catch (error) {
      console.error('Error loading expertise data:', error);
      return null;
    }
  }

  /**
   * Load banking data section
   * GET /technicians/{userId}
   */
  async loadBankingData(
    userId: string
  ): Promise<{
    iban: string;
    bic: string;
    bank_name: string;
    bank_account_holder: string;
  } | null> {
    try {
      const response = await springHttp.get<any>(`/technicians/${userId}`);
      const tech = response;

      if (!tech) return null;

      return {
        iban: tech.iban || '',
        bic: tech.bic || '',
        bank_name: tech.bankName || '',
        bank_account_holder: tech.bankAccountHolder || '',
      };
    } catch (error) {
      console.error('Error loading banking data:', error);
      return null;
    }
  }

  /**
   * Get complete partner application (Admin view)
   * GET /technicians/{userId}
   */
  async getPartnerApplication(
    userId: string
  ): Promise<{
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
  } | null> {
    try {
      const response = await springHttp.get<any>(`/technicians/${userId}`);
      const tech = response;

      if (!tech) return null;

      return {
        id: tech.id || '',
        company_name: tech.companyName || '',
        siren: tech.siren || '',
        ape_code: tech.apeCode || null,
        vat_number: tech.vatNumber || null,
        legal_status: tech.legalStatus || '',
        address: tech.address || '',
        postal_code: tech.postalCode || '',
        city: tech.currentCity || tech.city || '',
        skills: tech.specializations || [],
        years_experience: tech.yearsExperience || 0,
        insurance_company: tech.insuranceCompany || '',
        insurance_policy_number: tech.insurancePolicyNumber || '',
        insurance_expiry_date: tech.insuranceExpiryDate || '',
        has_decennial_insurance: tech.hasDecennialInsurance || false,
        bank_name: tech.bankName || '',
        bank_account_holder: tech.bankAccountHolder || '',
        iban: tech.iban || '',
        bic: tech.bic || '',
        birth_date: tech.birthDate || '',
        birth_place: tech.birthPlace || '',
        vehicle_types: (tech.vehicleTypes || []) as string[],
        certifications: (tech.certifications || []) as string[],
        zones: normalizeZones(tech.zone),
        validated_at: tech.validatedAt || null,
        status: tech.status || undefined,
        rejection_reason: tech.rejectionReason ?? null,
      };
    } catch (error) {
      console.error('Error fetching partner application:', error);
      return null;
    }
  }

  /**
   * Get partner statistics (Rating, interventions)
   * GET /technicians/admin?search={userId}
   */
  async getPartnerStats(
    userId: string
  ): Promise<{
    average_rating: number | null;
    completed_interventions: number;
    total_interventions: number;
  } | null> {
    try {
      const response = await springHttp.get<any>('/technicians/admin', {
        search: userId,
        page: '0',
        size: '100',
      });

      const technicianData = response?.content?.find(
        (t: any) => t.id === userId || t.userId === userId
      );

      if (!technicianData) return null;

      return {
        average_rating: technicianData.averageRating || null,
        completed_interventions: technicianData.completedInterventions || 0,
        total_interventions: technicianData.completedInterventions || 0,
      };
    } catch (error) {
      console.error('Error fetching partner stats:', error);
      return null;
    }
  }

  /**
   * Get all pending applications (with user info embedded)
   * GET /technicians?status=pending
   */
  async getPendingApplications(): Promise<PendingApplicationWithUser[]> {
    try {
      const response = await springHttp.get<any>('/technicians', { status: 'pending' });
      return (response || []).map(mapTechnicianResponse);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      return [];
    }
  }

  /**
   * Qualification tab — server-side search + pagination
   * GET /technicians/qualification?search&page&size
   */
  async getQualificationApplications(params: { search?: string; page: number; limit: number }): Promise<QualificationListResult> {
    const query: Record<string, string> = { page: String(params.page), size: String(params.limit) };
    if (params.search?.trim()) query.search = params.search.trim();
    const response = await springHttp.get<any>('/technicians/qualification', query);
    const content: QualificationTechnician[] = (response?.content || []).map((tech: any) => ({
      ...mapTechnicianResponse(tech),
      missingProfileFields: tech.missingProfileFields || [],
      readyForValidation: Boolean(tech.readyForValidation),
    }));
    return {
      content,
      total: Number(response?.total ?? content.length),
      readyCount: Number(response?.readyCount ?? content.filter(c => c.readyForValidation).length),
    };
  }

  /**
   * qualification → approved (server-side completeness check)
   * POST /technicians/{id}/qualification/validate → 409 PROFILE_INCOMPLETE | INVALID_STATUS
   */
  async approveApplication(applicationId: string): Promise<void> {
    try {
      await springHttp.post(`/technicians/${applicationId}/qualification/validate`, {});
    } catch (e: any) {
      if (e?.status === 409 || e?.errorCode) throw QualificationError.fromApiResponse(e.body, e.message);
      throw e;
    }
  }

  /** GET /technicians/counts → { pending, qualification, active } */
  async getTechnicianStatusCounts(): Promise<TechnicianStatusCounts> {
    const r = await springHttp.get<any>('/technicians/counts');
    return { pending: Number(r?.pending ?? 0), qualification: Number(r?.qualification ?? 0), active: Number(r?.active ?? 0) };
  }

  /**
   * Qualify technician application (pending → qualification)
   * POST /technicians/{id}/qualification
   */
  async qualifyApplication(applicationId: string, userAdminId: string): Promise<void> {
    try {
      await springHttp.post(`/technicians/${applicationId}/qualification`, { adminId: userAdminId });
    } catch (e: any) {
      if (e?.status === 409 || e?.errorCode) throw QualificationError.fromApiResponse(e.body, e.message);
      throw e;
    }
  }

  /**
   * Reject technician application
   * POST /technicians/{id}/reject ✅ CORRECT
   */
  async rejectApplication(applicationId: string, reason?: string): Promise<void> {
    try {
      await springHttp.post(`/technicians/${applicationId}/reject`, { reason: reason || null });
    } catch (e: any) {
      if (e?.status === 409 || e?.errorCode) throw QualificationError.fromApiResponse(e.body, e.message);
      throw e;
    }
  }
}
