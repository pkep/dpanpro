import { supabase } from '@/integrations/supabase/client';
import {IPartnersService, PartnerApplicationData} from "@/services/interfaces";
import type {
  PendingApplicationWithUser,
  QualificationListResult,
  QualificationTechnician,
  TechnicianStatusCounts,
} from "@/services/interfaces/partners.interface.ts";
import { services } from '@/services/factory';
import { normalizeVatNumber } from '@/lib/vatNumber';
import { computeMissingProfileFields, isProfileFieldRequired } from '@/lib/technicianProfileCompleteness';
import { QualificationError } from '@/services/errors/qualification.error';
import { normalizeZones } from '@/lib/zones';

/** Champ virtuel (photo contrôlée OK) — même clé que gateway TechnicianQualificationService.PHOTO_QUALITY */
const PHOTO_QUALITY_FIELD = 'photoQuality';

/** Re-throw a Supabase RPC error as a typed QualificationError. */
function rpcError(error: any): never {
  throw QualificationError.fromPostgresMessage(error?.message || error?.details || String(error));
}

/** Liste simple (certifications legacy) — les zones utilisent `normalizeZones`. */
function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('{')) {
      return trimmed.slice(1, -1).split(',').map((v: string) => v.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

class SupabasePartnersService implements IPartnersService{
  async submitApplication(data: PartnerApplicationData): Promise<void> {
    // First, create the user with role 'technician' and is_active = false
    const { data: newUser, error: userError } = await (supabase
      .from('users') as any)
      .insert({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        role: 'technician',
        is_active: false,
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
        address: data.address,
        postal_code: data.postalCode,
        city: data.city,
        company_name: data.companyName,
        siren: data.siren,
        legal_status: data.legalStatus,
        vehicle_types: data.vehicleTypes ?? null,
        ape_code: data.apeCode,
        vat_number: normalizeVatNumber(data.vatNumber),
        zone: normalizeZones(data.zones),
        skills: data.skills,
        certifications: data.certifications ?? null,
        years_experience: data.yearsExperience,
        presentation: data.presentation ?? data.motivation ?? null,
        kbis_url: data.kbisUrl ?? null,
        terms_accepted: data.termsAccepted,
        data_accuracy_confirmed: data.dataAccuracyConfirmed,
      } as Record<string, unknown>);

    if (applicationError) {
      // If application creation fails, we should delete the user we just created
      await (supabase.from('users') as any).delete().eq('id', newUser.id);
      throw applicationError;
    }

    // Send an email to new technician
    await services.notifications.notifyWelcomeJobTechnician(newUser.id);

    // Send an email notification to admins about the new application (handled by backend trigger or separate call)
    await services.notifications.notifyManagerAfterJobTechnician(newUser.id);

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
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, last_login_at, last_seen_at')
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
        siren: appData.siren,
        apeCode: appData.ape_code,
        vatNumber: (appData as { vat_number?: string | null }).vat_number ?? null,
        legalStatus: appData.legal_status,
        insuranceCompany: appData.insurance_company,
        insurancePolicyNumber: appData.insurance_policy_number,
        insuranceExpiryDate: appData.insurance_expiry_date,
        hasDecennialInsurance: appData.has_decennial_insurance,
        skills: appData.skills,
        yearsExperience: appData.years_experience,
        presentation: appData.presentation,
        motivation: appData.presentation,
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
      zones?: string[];
      companyName?: string;
      siren?: string;
      apeCode?: string;
      vatNumber?: string | null;
      legalStatus?: string;
      insuranceCompany?: string;
      insurancePolicyNumber?: string;
      insuranceExpiryDate?: string;
      hasDecennialInsurance?: boolean;
      skills?: string[];
      certifications?: string[];
      yearsExperience?: number;
      presentation?: string;
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
      const { error: userError } = await (supabase
        .from('users') as any)
        .update(userUpdates as any)
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
    if (data.zones !== undefined) {
      const zones = normalizeZones(data.zones);
      appUpdates.zone = zones.length > 0 ? zones : null;
    }
    if (data.companyName) appUpdates.company_name = data.companyName;
    if (data.siren) appUpdates.siren = data.siren;
    if (data.apeCode !== undefined) appUpdates.ape_code = data.apeCode || null;
    if (data.vatNumber !== undefined) appUpdates.vat_number = normalizeVatNumber(data.vatNumber);
    if (data.legalStatus) appUpdates.legal_status = data.legalStatus;
    if (data.insuranceCompany) appUpdates.insurance_company = data.insuranceCompany;
    if (data.insurancePolicyNumber) appUpdates.insurance_policy_number = data.insurancePolicyNumber;
    if (data.insuranceExpiryDate) appUpdates.insurance_expiry_date = data.insuranceExpiryDate;
    if (data.hasDecennialInsurance !== undefined) appUpdates.has_decennial_insurance = data.hasDecennialInsurance;
    if ((data as { vehicleTypes?: string[] }).vehicleTypes !== undefined) appUpdates.vehicle_types = (data as { vehicleTypes?: string[] }).vehicleTypes;
    if (data.certifications !== undefined) appUpdates.certifications = (data.certifications && data.certifications.length > 0) ? data.certifications : null;
    if (data.skills) appUpdates.skills = data.skills;
    if (data.yearsExperience !== undefined) appUpdates.years_experience = data.yearsExperience;
    if (data.presentation) appUpdates.presentation = data.presentation;
    // Le formulaire « Expertises » édite la motivation : même colonne que presentation.
    const motivation = (data as { motivation?: string }).motivation;
    if (motivation) appUpdates.presentation = motivation;
    if (data.bankAccountHolder) appUpdates.bank_account_holder = data.bankAccountHolder;
    if (data.bankName) appUpdates.bank_name = data.bankName;
    if (data.iban) appUpdates.iban = data.iban;
    if (data.bic) appUpdates.bic = data.bic;

    if (Object.keys(appUpdates).length > 0) {
      const { error: appError } = await (supabase
        .from('partner_applications') as any)
        .update(appUpdates as any)
        .eq('user_id', userId);

      if (appError) throw appError;
    }
  }

  // ── Load partner application data (pas d'appels directs Supabase) ──
  async loadPartnerApplicationData(userId: string): Promise<{
    siren: string;
    company_name: string;
    legal_status: string;
    ape_code: string | null;
    vat_number: string | null;
    address: string;
    city: string;
    postal_code: string;
  } | null> {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('siren, company_name, legal_status, ape_code, vat_number, address, city, postal_code')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  // ── Load expertise data (pas d'appels directs Supabase) ──
  async loadExpertiseData(userId: string): Promise<{
    skills: string[];
    years_experience: number;
    current_city: string | null;
  } | null> {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('skills, years_experience, current_city')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  // ── Load banking data (pas d'appels directs Supabase) ──
  async loadBankingData(userId: string): Promise<{
    iban: string;
    bic: string;
    bank_name: string;
    bank_account_holder: string;
  } | null> {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('iban, bic, bank_name, bank_account_holder')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  // ── Partner application (Admin) ──
  async getPartnerApplication(userId: string): Promise<{
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
    certifications?: string[];
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
  } | null> {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    // Normalize vehicle_types (Postgres enum array) to a JS string array,
    // with a legacy fallback on the old boolean has_vehicule (pre-V14 schema).
    const raw = (data as any)?.vehicle_types;
    let vehicleTypes: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === 'string' && raw.startsWith('{')
        ? raw.slice(1, -1).split(',').map((v: string) => v.trim()).filter(Boolean)
        : [];
    if (vehicleTypes.length === 0 && (data as any)?.has_vehicule) {
      vehicleTypes = ['car'];
    }

    const zones = normalizeZones((data as any)?.zone);
    const certifications = normalizeStringList((data as any)?.certifications);

    return { ...(data as Record<string, unknown>), vehicle_types: vehicleTypes, zones, certifications } as unknown as typeof data;
  }

  // ── Partner statistics (Admin) ──
  async getPartnerStats(userId: string): Promise<{
    average_rating: number | null;
    completed_interventions: number;
    total_interventions: number;
  } | null> {
    const { data, error } = await supabase
      .from('partner_statistics')
      .select('average_rating, completed_interventions, total_interventions')
      .eq('partner_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  // ── Admin: Qualify application: pending → qualification ──
  // Server-side RPC (SECURITY DEFINER): sets status=qualification, no validated_at.
  // L'activation du compte (users.is_active=true) se fait via le lien d'activation de l'email.
  async qualifyApplication(applicationId: string, userAdminId: string): Promise<void> {
    const { data: app, error } = await (supabase as any).rpc('accept_technician_application', { p_application_id: applicationId });
    if (error) rpcError(error);
    const userId: string = app?.user_id;

    // Technician role row (idempotent — ignore duplicate)
    const { error: roleError } = await (supabase.from('user_roles') as any)
      .insert({ user_id: userId, role: 'technician', created_by: userAdminId });
    if (roleError && !String(roleError.message || '').toLowerCase().includes('duplicate')) {
      console.warn('[partners] user_roles insert failed (non-blocking):', roleError.message);
    }

    const { data: userData } = await supabase.from('users').select('email, first_name').eq('id', userId).single();
    if (userData?.email) {
      await services.notifications.notifyTechnicianApplication({
        technicianId: userId,
        action: 'qualification',
        email: userData.email,
        firstName: userData.first_name,
      });
    }
  }

  // ── Admin: Qualification tab ──
  async getQualificationApplications(params: { search?: string; page: number; limit: number }): Promise<QualificationListResult> {
    const { data: appsData, error: appError } = await (supabase as any)
      .from('partner_applications')
      .select('id, user_id, company_name, siren, vat_number, legal_status, skills, certifications, years_experience, zone, created_at, updated_at, validated_at, status, iban, bic, bank_account_holder, bank_name')
      .eq('status', 'qualification')
      .order('created_at', { ascending: false });
    if (appError) throw appError;

    const apps: any[] = appsData || [];
    if (apps.length === 0) return { content: [], total: 0, readyCount: 0 };

    const userIds = apps.map(a => a.user_id).filter(Boolean);
    const { data: usersData, error: usersError } = await (supabase as any)
      .from('users')
      .select('id, first_name, last_name, email, phone, avatar_url, is_active, password_hash, photo_quality_ok, last_login_at, last_seen_at')
      .in('id', userIds);
    if (usersError) throw usersError;
    const usersById = new Map<string, any>((usersData || []).map((u: any) => [u.id, u]));

    let items: QualificationTechnician[] = apps
      .map(app => {
        const u = usersById.get(app.user_id);
        if (!u) return null;
        const missing: string[] = computeMissingProfileFields({
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url,
          passwordHash: u.password_hash,
          hasApplication: true,
          bankAccountHolder: app.bank_account_holder,
          bankName: app.bank_name,
          iban: app.iban,
          bic: app.bic,
        });
        if (!u.photo_quality_ok) missing.push(PHOTO_QUALITY_FIELD);
        const readyForValidation = !missing.some(f => isProfileFieldRequired(f) || f === PHOTO_QUALITY_FIELD);
        return {
          ...app,
          vatNumber: app.vat_number ?? null,
          zones: normalizeZones(app.zone),
          certifications: normalizeStringList(app.certifications),
          status: 'qualification' as const,
          user: {
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            phone: u.phone,
            avatar_url: u.avatar_url,
            is_active: u.is_active,
            photo_quality_ok: u.photo_quality_ok,
            last_login_at: u.last_login_at ?? null,
            last_seen_at: u.last_seen_at ?? null,
          },
          missingProfileFields: missing,
          readyForValidation,
        } as QualificationTechnician;
      })
      .filter((x): x is QualificationTechnician => x !== null);

    const q = (params.search || '').trim().toLowerCase();
    if (q) {
      items = items.filter(t =>
        `${t.user.first_name} ${t.user.last_name}`.toLowerCase().includes(q)
        || (t.user.email || '').toLowerCase().includes(q)
        || (t.user.phone || '').toLowerCase().includes(q)
        || (t.company_name || '').toLowerCase().includes(q));
    }
    items.sort((a, b) => (a.user.last_name || '').localeCompare(b.user.last_name || '', 'fr', { sensitivity: 'base' })
      || (a.user.first_name || '').localeCompare(b.user.first_name || '', 'fr', { sensitivity: 'base' }));

    const total = items.length;
    const readyCount = items.filter(t => t.readyForValidation).length;
    const from = Math.max(0, (params.page - 1) * params.limit);
    return { content: items.slice(from, from + params.limit), total, readyCount };
  }

  async approveApplication(applicationId: string): Promise<void> {
    const { data: app, error } = await (supabase as any).rpc('validate_technician_qualification', { p_application_id: applicationId });
    if (error) rpcError(error);
    const userId: string = app?.user_id;
    const { data: userData } = await supabase.from('users').select('email, first_name').eq('id', userId).single();
    if (userData?.email) {
      await services.notifications.notifyTechnicianApplication({
        technicianId: userId,
        action: 'approved',
        email: userData.email,
        firstName: userData.first_name,
      });
    }
  }

  async getTechnicianStatusCounts(): Promise<TechnicianStatusCounts> {
    const { data, error } = await (supabase as any).rpc('technician_status_counts');
    if (error) throw error;
    return {
      pending: Number(data?.pending ?? 0),
      qualification: Number(data?.qualification ?? 0),
      active: Number(data?.active ?? 0),
    };
  }

  async getPendingApplications(): Promise<PendingApplicationWithUser[]> {
    try {
      // Get pending applications
      const { data: appsData, error: appError } = await supabase
        .from('partner_applications')
        .select('id, user_id, company_name, siren, vat_number, legal_status, skills, certifications, years_experience, zone, created_at, validated_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (appError) throw appError;

      // Enrich with user info
      const apps = (appsData || []) as unknown as Array<{
        id: string; user_id: string; company_name: string; siren: string; vat_number: string;
        legal_status: string; skills: string[]; certifications: string[]; years_experience: number;
        zone: string[]; created_at: string; validated_at: string | null;
      }>;
      const applicationsWithUsers: PendingApplicationWithUser[] = [];
      for (const app of apps) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone, last_login_at, last_seen_at')
          .eq('id', app.user_id)
          .single();

        if (!userError && userData) {
          applicationsWithUsers.push({
            ...app,
            vatNumber: (app as any)?.vat_number ?? null,
            zones: normalizeZones((app as any)?.zone),
            certifications: normalizeStringList((app as any)?.certifications),
            user: userData,
          });
        }
      }

      return applicationsWithUsers;
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      return [];
    }
  }
  // ── Admin: Accept application ──

  // ── Admin: Reject application: pending|qualification → rejected (+ users.is_active=false) ──
  async rejectApplication(applicationId: string, reason?: string): Promise<void> {
    const { data: app, error } = await (supabase as any).rpc('reject_technician_application', {
      p_application_id: applicationId,
      p_reason: reason || null,
    });
    if (error) rpcError(error);
    const userId: string = app?.user_id;

    const { data: userData } = await supabase.from('users').select('email, first_name').eq('id', userId).single();
    if (userData?.email) {
      await services.notifications.notifyTechnicianApplication({
        technicianId: userId,
        action: 'rejected',
        email: userData.email,
        firstName: userData.first_name,
        reason,
      });
    }
  }
}

export const partnersService = new SupabasePartnersService();
