// Barrel export of all service interfaces
export type { IAuthService } from './auth.interface';
export type { IInterventionsService } from './interventions.interface';
export type { IUsersService } from './users.interface';
export type { IDispatchService, DispatchResult, DispatchAttempt } from './dispatch.interface';
export type { IPaymentService, PaymentAuthorization, ManualPaymentMethod } from './payment.interface';
export type { IQuotesService, QuoteLine, QuoteInput, QuoteSummary, Service } from './quotes.interface';
export type { IRatingsService, Rating } from './ratings.interface';
export type { IMessagesService, InterventionMessage } from './messages.interface';
export type { IScheduleService, TechnicianSchedule, ScheduleOverride } from './schedule.interface';
export type { ITechniciansService, TechnicianWithLocation, NearbyTechnician } from './technicians.interface';
export type { IServicesService, Service as ServiceDefinition } from './services.interface';
export type { IHistoryService } from './history.interface';
export type { IPhotosService } from './photos.interface';
export type { IWorkPhotosService, WorkPhoto, WorkPhotoType } from './work-photos.interface';
export type { IRevenueService, RevenueStats, WeeklyStats, PerformanceStats, PaymentPeriod, MonthlyPayout } from './revenue.interface';
export type { IStatisticsService, DailyStats, CategoryStats, StatusStats, TechnicianStats } from './statistics.interface';
export type { IConfigurationService, DispatchAlgorithmConfig, ConfigurationHistoryEntry } from './configuration.interface';
export type { ICancellationService, CancellationResult } from './cancellation.interface';
export type { IPartnersService, PartnerApplicationData } from './partners.interface';
export type { IRolesService, AppRole, UserRoleRecord, ManagerPermissions, ManagerWithRoles } from './roles.interface';
export type { IGeocodingService } from './geocoding.interface';
export type { IPerformanceService, TechnicianPerformance, PerformanceTrend, ZoneStats, DateRange } from './performance.interface';
export type { IPricingService, PriorityMultiplier } from './pricing.interface';
export type { IQuoteModificationsService, QuoteModification, QuoteModificationItem, CreateQuoteModificationInput } from './quote-modifications.interface';
export type { IQuestionnaireService } from './questionnaire.interface';
export type { IStorageService } from './storage.interface';
export type { IInvoiceService, InvoiceData } from './invoice.interface';
export type { IRealtimeService, RealtimeChannel, DispatchUpdatePayload } from './realtime.interface';
export type { INotificationsService } from './notifications.interface';
export type { IAuthOperationsService } from './auth-operations.interface';
export type { INotificationPreferencesService, NotificationSetting, UserNotificationPreference } from './notification-preferences.interface';
export type { IPayoutsService, TechnicianPayout } from './payouts.interface';
export type { ISiteSettingsService, SiteSetting } from './site-settings.interface';
export type { IWhatsAppAgentsService, WhatsAppAgent, WhatsAppAgentInput } from './whatsapp-agents.interface';
export type { IEligibleTechniciansService, EligibleTechnician, GetEligibleParams } from './eligible-technicians.interface';
export type { IAdminStatsService, AdminStats } from './admin-stats.interface';
export type { IPhoneVerificationService } from './phone-verification.interface';
export type { IArticlesService } from './article.interface';

// Centralized database shape interfaces
export type {
  DbQuoteLine,
  DbPriorityMultiplier,
  DbRating,
  DbService,
  DbQuoteModification,
  DbQuoteModificationItem,
  DbInterventionMessage,
  DbWorkPhoto,
  DbUserRole,
  DbManagerPermissions,
  DbDispatchConfig,
  DbConfigHistory,
  DbInvoice,
  DbDispute,
} from './supabase-database.interface';

// HTTP/API response interfaces
export type { ApiResponse, PageData, SpringAuthResponse, ApiErrorResponse } from './http.interface';
