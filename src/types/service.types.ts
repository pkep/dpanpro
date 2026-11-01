// ============================================================
// Canonical service types — used across Spring and Supabase
// implementations. Decoupled from any backend provider.
// ============================================================

import type { TechnicianApplicationNotificationAction } from './technicianApplication.types';

// ── Services ─────────────────────────────────────────────────
export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  basePrice: number;
  defaultPriority: string;
  displacementPrice: number | null;
  securityPrice: number | null;
  repairPrice: number | null;
  vatRateIndividual: number | null;
  vatRateProfessional: number | null;
  targetArrivalTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ── Dispatch ──────────────────────────────────────────────────
export interface DispatchResult {
  success: boolean;
  message?: string;
  technicianId?: string;
  attemptId?: string;
}

export interface DispatchAttempt {
  id: string;
  interventionId: string;
  technicianId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Payment ───────────────────────────────────────────────────
export interface PaymentAuthorization {
  id: string;
  interventionId?: string;
  amount: number;
  currency: string;
  status:
    | 'pending'
    | 'authorized'
    | 'captured'
    | 'cancelled'
    | 'failed'
    | 'refunded'
    | 'partially_refunded';
  stripePaymentIntentId?: string;
  clientEmail?: string;
  clientPhone?: string;
  checkoutUrl?: string;
  capturedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRow {
  id: string;
  interventionId: string | null;
  amountAuthorized: number;
  currency: string;
  status: string;
  clientEmail: string | null;
  providerPaymentId: string | null;
  createdAt: string;
  capturedAt: string | null;
  cancelledAt: string | null;
  // joined fields
  interventionTitle?: string;
  interventionAddress?: string;
  interventionCity?: string;
  interventionStatus?: string;
  clientName?: string;
  isCancellationFee?: boolean;
}

// ── Messages ──────────────────────────────────────────────────
export interface InterventionMessage {
  id: string;
  interventionId: string;
  senderId: string;
  senderRole: 'client' | 'technician';
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── Ratings ───────────────────────────────────────────────────
export interface Rating {
  id: string;
  interventionId: string;
  clientId: string;
  technicianId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

// ── Revenue ───────────────────────────────────────────────────
export interface RevenueStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalCompleted: number;
  totalInterventions: number;
  averagePerIntervention: number;
}

export interface WeeklyStats {
  days: Array<{ date: string; revenue: number; interventions: number }>;
  total: number;
}

export interface PerformanceStats {
  completionRate: number;
  averageRating: number;
  totalInterventions: number;
  onTimeRate: number;
  avgResponseTime: number;
}

export interface PaymentPeriod {
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalCommission: number;
  netRevenue: number;
  interventionCount: number;
}

export interface MonthlyPayout {
  id: string;
  technicianId: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

// ── Roles ─────────────────────────────────────────────────────
export type AppRole = 'client' | 'technician' | 'manager' | 'admin';

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: AppRole;
  createdBy?: string;
  createdAt: string;
}

export interface ManagerPermissions {
  userId: string;
  canCreateManagers: boolean;
  grantedBy?: string;
  grantedAt?: string;
}

// ── Schedule ──────────────────────────────────────────────────
export interface TechnicianSchedule {
  id: string;
  technicianId: string;
  dayOfWeek: number;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface ScheduleOverride {
  id: string;
  technicianId: string;
  date: string;
  isAvailable: boolean;
  reason?: string;
  createdAt: string;
}

// ── Statistics ────────────────────────────────────────────────
export interface PerformanceKPIs {
  avgResponseTime: number | null;   // secondes
  avgArrivalTime: number | null;    // secondes
  avgRating: number | null;
  acceptanceRate: number | null;    // %
  avgRevenuePerTech: number;        // €
  firstPassRate: number | null;     // %
}

export interface DashboardStats {
  totalTechnicians: number;
  totalClients: number;
  totalInterventions: number;
  interventionsMonth: number;
  interventionsToday: number;
  caMonth: number;
  pendingInterventions: number;
  completedInterventions: number;
  averageResolutionMinutes: number;
}

export interface DailyStats {
  date: string;
  interventions: number;
  revenue: number;
  completedInterventions: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  revenue: number;
  averageRating?: number;
}

export interface StatusStats {
  status: string;
  count: number;
  percentage: number;
}

export interface TechnicianStats {
  technicianId: string;
  name: string;
  completedInterventions: number;
  averageRating: number;
  totalRevenue: number;
  responseRate: number;
}

// ── Performance ───────────────────────────────────────────────
export interface TechnicianPerformance {
  technicianId: string;
  name: string;
  interventionsCompleted: number;
  avgRating: number;
  avgResponseTimeMinutes: number;
  revenueGenerated: number;
  completionRate: number;
}

export interface PerformanceTrend {
  date: string;
  interventions: number;
  revenue: number;
  avgRating: number;
}

export interface ZoneStats {
  zone: string;
  latitude: number;
  longitude: number;
  interventionCount: number;
  radius: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ── Technicians ───────────────────────────────────────────────
export interface TechnicianAdminItem {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  skills: string[];
  averageRating: number | null;
  completedInterventions: number;
  createdAt: string;
}

export interface TechnicianAdminPage {
  content: TechnicianAdminItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface TechnicianWithLocation {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  latitude: number;
  longitude: number;
  city?: string;
  skills: string[];
  status: 'available' | 'busy' | 'en_route';
  updatedAt: string;
}

export interface NearbyTechnician extends TechnicianWithLocation {
  distance: number;
  estimatedArrivalMinutes?: number;
}

// ── Work Photos ───────────────────────────────────────────────
export type WorkPhotoType = 'before' | 'after';

export interface WorkPhoto {
  id: string;
  interventionId: string;
  uploadedBy: string;
  photoUrl: string;
  photoType: WorkPhotoType;
  description?: string;
  createdAt: string;
}

// ── Partners ──────────────────────────────────────────────────
export interface RejectedApplication {
  id: string;
  userId: string;
  companyName: string;
  siren: string;
  legalStatus: string;
  skills: string[];
  yearsExperience: number;
  address: string;
  postalCode: string;
  city: string;
  motivation: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields (available in Supabase, may be partial in Spring)
  birthDate?: string;
  birthPlace?: string;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  hasDecennialInsurance?: boolean;
  apeCode?: string | null;
  vatNumber?: string | null;
  bankAccountHolder?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  kbisUrl?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
}

export interface RejectedApplicationPage {
  content: RejectedApplication[];
  totalElements: number;
  totalPages: number;
  page: number;
}

export interface PartnerApplicationData {
    id: string;
    userId: string;
    companyName: string;
    siren: string;
    legalStatus: string;
    skills: string[];
    yearsExperience: number;
    address: string;
    postalCode: string;
    city: string;
    motivation: string;
    createdAt: string;
    updatedAt: string;
    // Extended fields (available in Supabase, may be partial in Spring)
    birthDate?: string;
    birthPlace?: string;
    insuranceCompany?: string;
    insurancePolicyNumber?: string;
    insuranceExpiryDate?: string;
    hasDecennialInsurance?: boolean;
    apeCode?: string | null;
    vatNumber?: string | null;
    bankAccountHolder?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    kbisUrl?: string | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
}

// ── Cancellation ──────────────────────────────────────────────
export interface CancellationResult {
  success: boolean;
  feesApplied: boolean;
  feesAmount?: number;
  message?: string;
}

// ── Pricing ───────────────────────────────────────────────────
export interface PriorityMultiplier {
  id: string;
  priority: string;
  multiplier: number;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── Configuration ─────────────────────────────────────────────
export interface DispatchAlgorithmConfig {
  id?: string;
  weightProximity: number;
  weightSkills: number;
  weightWorkload: number;
  weightRating: number;
  maxDistanceKm: number;
  timeoutSeconds: number;
  autoDispatch: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfigurationHistoryEntry {
  id: string;
  tableName: string;
  recordId: string;
  changedBy: string;
  changeType: string;
  oldValue?: string;
  newValue?: string;
  changedAt: string;
}

// ── Notification ─────────────────────────────────────────────
export interface SendInvoiceEmailInput {
  interventionId: string;
}

export interface SendContactEmailInput {
  profileType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
}

export interface SendQuoteEmailInput {
  interventionId: string;
}

export interface NotificationSetting {
  id: string;
  eventType: string;
  channel: 'push' | 'sms' | 'email';
  isEnabled: boolean;
  applicableRoles: string[];
  description: string | null;
}

export interface WelcomeNotificationInput {
  firstName: string;
  lastName: string;
  email: string;
  tempPassword?: string;
  loginUrl?: string;
}

export interface TechnicianApplicationNotificationInput {
  technicianId: string;
  action: TechnicianApplicationNotificationAction;
  email: string;
  firstName: string;
  reason?: string;
}