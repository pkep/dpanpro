/**
 * Service Factory - Centralizes service instantiation based on API_MODE.
 * 
 * Usage: import { services } from '@/services/factory';
 * Then:  services.auth.login(...)
 *        services.interventions.getInterventions(...)
 * 
 * Switch modes via VITE_API_MODE env variable:
 *   - 'supabase' (default): Uses existing Supabase implementations
 *   - 'spring': Uses Spring Boot REST API implementations
 */

import { isSpringMode } from '@/config/api.config';

// --- Supabase implementations ---
import { authService as supabaseAuthService } from '@/services/supabase/auth.service';
import { interventionsService as supabaseInterventionsService } from '@/services/supabase/interventions.service';
import { usersService as supabaseUsersService } from '@/services/supabase/users.service';
import { dispatchService as supabaseDispatchService } from '@/services/supabase/dispatch.service';
import { paymentService as supabasePaymentService } from '@/services/supabase/payment.service';
import { quotesService as supabaseQuotesService } from '@/services/supabase/quotes.service';
import { ratingsService as supabaseRatingsService } from '@/services/supabase/ratings.service';
import { supabaseClientRatingsService } from '@/services/supabase/client-ratings.service';
import { messagesService as supabaseMessagesService } from '@/services/supabase/messages.service';
import { scheduleService as supabaseScheduleService } from '@/services/supabase/schedule.service';
import { techniciansService as supabaseTechniciansService } from '@/services/supabase/technicians.service';
import { servicesService as supabaseServicesService } from '@/services/supabase/services.service';
import { historyService as supabaseHistoryService } from '@/services/supabase/history.service';
import { photosService as supabasePhotosService } from '@/services/supabase/photos.service';
import { workPhotosService as supabaseWorkPhotosService } from '@/services/supabase/work-photos.service';
import { revenueService as supabaseRevenueService } from '@/services/supabase/revenue.service';
import { statisticsService as supabaseStatisticsService } from '@/services/supabase/statistics.service';
import { supabaseSiteStatsService } from '@/services/supabase/site-stats.service';
import { configurationService as supabaseConfigurationService } from '@/services/supabase/configuration.service';
import { cancellationService as supabaseCancellationService } from '@/services/supabase/cancellation.service';
import { partnersService as supabasePartnersService } from '@/services/supabase/partners.service';
import { rolesService as supabaseRolesService } from '@/services/supabase/roles.service';
import { performanceService as supabasePerformanceService } from '@/services/supabase/performance.service';
import { pricingService as supabasePricingService } from '@/services/supabase/pricing.service';
import { quoteModificationsService as supabaseQuoteModificationsService } from '@/services/supabase/quote-modifications.service';
import { supabaseRealtimeService } from '@/services/supabase/realtime.service';
import { SupabaseStorageProvider } from '@/services/supabase/storage.provider';
import { CloudflareR2Provider } from '@/services/cloudflare/r2.provider';
import { BackendR2ProxyProvider } from '@/services/backend-proxy/r2-proxy.provider';
import { supabaseQuestionnaireService } from '@/services/supabase/questionnaire-wrapper.service';
import { supabaseInvoiceService } from '@/services/supabase/invoice-service';
import { supabasePayoutsService } from '@/services/supabase/payouts.service';
import { supabaseNotificationsService } from '@/services/supabase/notifications.service';
import { supabaseAuthOperationsService } from '@/services/supabase/auth-operations.service';
import { supabaseNotificationPreferencesService } from '@/services/supabase/notification-preferences.service';
import { supabaseSiteSettingsService } from '@/services/supabase/site-settings.service';
import { supabaseTechnicianPositionService } from '@/services/supabase/technician-position.service';
import { supabaseEligibleTechniciansService } from '@/services/supabase/eligible-technicians.service';
import { supabaseDisputesService } from '@/services/supabase/disputes.service';
import { adminStatsService as supabaseAdminStatsService } from '@/services/supabase/admin-stats.service';
import { phoneVerificationService as supabasePhoneVerificationService } from '@/services/supabase/phone-verification.service';
import { uploadDocumentService as supabaseUploadDocumentService } from '@/services/supabase/upload-document.service';
import { agentReceiverService as supabaseAgentReceiverService } from '@/services/supabase/agent-receiver.service';
import { supabaseWhatsAppAgentsService } from '@/services/supabase/whatsapp-agents.service';
import { supabaseArticlesService } from '@/services/supabase/articles.service';
import { zoneDeployService as supabaseZoneDeployService } from '@/services/supabase/zone-deploy.service';
import { escalationsService as supabaseEscalationsService } from '@/services/supabase/escalations.service';
import { b2bService as supabaseB2bService } from '@/services/supabase/b2b.service';
import { affiliateService as supabaseAffiliateService } from '@/services/supabase/affiliate.service';
import { affiliateCampaignService as supabaseAffiliateCampaignService } from '@/services/supabase/affiliate-campaign.service';

// --- Spring implementations ---
import { SpringAuthService } from '@/services/spring/auth.spring';
import { SpringInterventionsService } from '@/services/spring/interventions.spring';
import { SpringUsersService } from '@/services/spring/users.spring';
import { SpringDispatchService } from '@/services/spring/dispatch.spring';
import { SpringPaymentService } from '@/services/spring/payment.spring.ts';
import { SpringQuotesService } from '@/services/spring/quotes.spring';
import { SpringRatingsService } from '@/services/spring/ratings.spring';
import { SpringClientRatingsService } from '@/services/spring/client-ratings.spring';
import { SpringMessagesService } from '@/services/spring/messages.spring';
import { SpringScheduleService } from '@/services/spring/schedule.spring';
import { SpringTechniciansService } from '@/services/spring/technicians.spring';
import { SpringServicesService } from '@/services/spring/services.spring';
import { SpringHistoryService } from '@/services/spring/history.spring';
import { SpringPhotosService } from '@/services/spring/photos.spring';
import { SpringWorkPhotosService } from '@/services/spring/work-photos.spring';
import { SpringRevenueService } from '@/services/spring/revenue.spring';
import { SpringStatisticsService } from '@/services/spring/statistics.spring';
import { SpringSiteStatsService } from '@/services/spring/site-stats.spring';
import { SpringConfigurationService } from '@/services/spring/configuration.spring';
import { SpringCancellationService } from '@/services/spring/cancellation.spring';
import { SpringPartnersService } from '@/services/spring/partners.spring';
import { SpringRolesService } from '@/services/spring/roles.spring';
import { SpringPerformanceService } from '@/services/spring/performance.spring';
import { SpringPricingService } from '@/services/spring/pricing.spring';
import { SpringQuoteModificationsService } from '@/services/spring/quote-modifications.spring';
import { SpringRealtimeService } from '@/services/spring/realtime.spring';
import { SpringStorageProvider } from '@/services/spring/storage.provider';
import { SpringQuestionnaireService } from '@/services/spring/questionnaire.spring';
import { SpringInvoiceService } from '@/services/spring/invoice.spring';
import { SpringPayoutsService } from '@/services/spring/payouts.spring';
import { SpringNotificationsService } from '@/services/spring/notifications.spring';
import { SpringAuthOperationsService } from '@/services/spring/auth-operations.spring';
import { SpringNotificationPreferencesService } from '@/services/spring/notification-preferences.spring';
import { SpringSiteSettingsService } from '@/services/spring/site-settings.spring';
import { SpringTechnicianPositionService } from '@/services/spring/technician-position.spring';
import { SpringEligibleTechniciansService } from '@/services/spring/eligible-technicians.spring';
import { SpringDisputesService } from '@/services/spring/disputes.spring';
import { SpringAdminStatsService } from '@/services/spring/admin-stats.spring';
import { SpringPhoneVerificationService } from '@/services/spring/phone-verification.spring';
import { uploadDocumentService as springUploadDocumentService } from '@/services/spring/upload-document.spring';
import { SpringAgentReceiverService } from '@/services/spring/agent-receiver.spring';
import { SpringWhatsAppAgentsService } from '@/services/spring/whatsapp-agents.spring';
import { SpringZoneDeployService } from '@/services/spring/zone-deploy.spring';
import { SpringEscalationsService } from '@/services/spring/escalations.spring';
import { SpringB2bService } from '@/services/spring/b2b.spring';
import { SpringAffiliateService } from '@/services/spring/affiliate.spring';
import { SpringAffiliateCampaignService } from '@/services/spring/affiliate-campaign.spring';
import { SpringArticlesService } from '@/services/spring/articles.spring';
import { loggingService } from '@/services/spring/logging.spring';
import type { ILoggingService } from '@/services/interfaces/logging.interface';

// --- Interfaces ---
import type { IAddressService } from '@/services/interfaces/address.interface';
import type { IAuthService } from '@/services/interfaces/auth.interface';
import type { IInterventionsService } from '@/services/interfaces/interventions.interface';
import type { IUsersService } from '@/services/interfaces/users.interface';
import type { IDispatchService } from '@/services/interfaces/dispatch.interface';
import type { IPaymentService } from '@/services/interfaces/payment.interface';
import type { IQuotesService } from '@/services/interfaces/quotes.interface';
import type { IRatingsService } from '@/services/interfaces/ratings.interface';
import type { IClientRatingsService } from '@/services/interfaces/client-ratings.interface';
import type { IMessagesService } from '@/services/interfaces/messages.interface';
import type { IScheduleService } from '@/services/interfaces/schedule.interface';
import type { ITechniciansService } from '@/services/interfaces/technicians.interface';
import type { IServicesService } from '@/services/interfaces/services.interface';
import type { IHistoryService } from '@/services/interfaces/history.interface';
import type { IPhotosService } from '@/services/interfaces/photos.interface';
import type { IWorkPhotosService } from '@/services/interfaces/work-photos.interface';
import type { IRevenueService } from '@/services/interfaces/revenue.interface';
import type { IStatisticsService } from '@/services/interfaces/statistics.interface';
import type { ISiteStatsService } from '@/services/interfaces/site-stats.interface';
import type { IConfigurationService } from '@/services/interfaces/configuration.interface';
import type { ICancellationService } from '@/services/interfaces/cancellation.interface';
import type { IPartnersService } from '@/services/interfaces/partners.interface';
import type { IRolesService } from '@/services/interfaces/roles.interface';
import type { IPerformanceService } from '@/services/interfaces/performance.interface';
import type { IPricingService } from '@/services/interfaces/pricing.interface';
import type { IQuoteModificationsService } from '@/services/interfaces/quote-modifications.interface';
import type { IRealtimeService } from '@/services/interfaces/realtime.interface';
import type { IQuestionnaireService } from '@/services/interfaces/questionnaire.interface';
import type {IStorageProvider, IStorageService} from '@/services/interfaces/storage.interface';
import type { IInvoiceService } from '@/services/interfaces/invoice.interface';
import type { INotificationsService } from '@/services/interfaces/notifications.interface';
import type { INotificationPreferencesService } from '@/services/interfaces/notification-preferences.interface';
import type { IPayoutsService, TechnicianPayout } from '@/services/interfaces/payouts.interface';
import type { ISiteSettingsService, SiteSetting } from '@/services/interfaces/site-settings.interface';
import type { ITechnicianPositionService } from '@/services/interfaces/technician-position.interface';
import type { IEligibleTechniciansService } from '@/services/interfaces/eligible-technicians.interface';
import type { IDisputesService } from '@/services/interfaces/disputes.interface';
import type { IAdminStatsService } from '@/services/interfaces/admin-stats.interface';
import type { IPhoneVerificationService } from '@/services/interfaces/phone-verification.interface';
import type { IUploadDocumentService } from '@/services/interfaces/upload-document.interface';
import type { IAgentReceiverService } from '@/services/interfaces/agent-receiver.interface';
import type { IWhatsAppAgentsService } from '@/services/interfaces/whatsapp-agents.interface';
import type { IZoneDeployService } from '@/services/interfaces/zone-deploy.interface';
import type { IAffiliateService } from '@/services/interfaces/affiliate.interface';
import type { IAffiliateCampaignService } from '@/services/interfaces/affiliate-campaign.interface';
import type { IArticlesService } from '@/services/interfaces/article.interface';
import type { IEscalationsService } from '@/services/interfaces/escalations.interface';
import type { IB2bService } from '@/services/interfaces/b2b.interface';

// Storage Service Implementation
import { StorageService } from '@/services/components/utils/storage/storage.service';
import {IAuthOperationsService} from "@/services/interfaces";

export interface ServiceContainer {
  auth: IAuthService;
  interventions: IInterventionsService;
  users: IUsersService;
  dispatch: IDispatchService;
  payment: IPaymentService;
  quotes: IQuotesService;
  ratings: IRatingsService;
  clientRatings: IClientRatingsService;
  messages: IMessagesService;
  schedule: IScheduleService;
  technicians: ITechniciansService;
  services: IServicesService;
  history: IHistoryService;
  photos: IPhotosService;
  workPhotos: IWorkPhotosService;
  revenue: IRevenueService;
  statistics: IStatisticsService;
  siteStats: ISiteStatsService;
  configuration: IConfigurationService;
  cancellation: ICancellationService;
  partners: IPartnersService;
  roles: IRolesService;
  performance: IPerformanceService;
  pricing: IPricingService;
  quoteModifications: IQuoteModificationsService;
  realtime: IRealtimeService;
  questionnaire: IQuestionnaireService;
  storage: IStorageService;
  invoice: IInvoiceService;
  notifications: INotificationsService;
  authOperations: IAuthOperationsService;
  notificationPreferences: INotificationPreferencesService;
  payouts: IPayoutsService;
  siteSettings: ISiteSettingsService;
  technicianPosition: ITechnicianPositionService;
  eligibleTechnicians: IEligibleTechniciansService;
  disputes: IDisputesService;
  adminStats: IAdminStatsService;
  phoneVerification: IPhoneVerificationService;
  uploadDocument: IUploadDocumentService;
  logging: ILoggingService;
  agentReceivers: IAgentReceiverService;
  whatsappAgents: IWhatsAppAgentsService;
  zoneDeploy: IZoneDeployService;
  affiliates: IAffiliateService;
  affiliateCampaign: IAffiliateCampaignService;
 articles: IArticlesService;
  escalations: IEscalationsService;
  b2b: IB2bService;
}

/**
 * Select storage provider based on VITE_STORAGE_PROVIDER env var.
 * Auto-detects the correct provider when not explicitly set:
 *   - Spring mode  → 'backend-proxy' (credentials stay server-side)
 *   - Supabase mode → 'supabase'
 */
function getStorageProvider(): IStorageProvider {
  const storageProvider =
    import.meta.env.VITE_STORAGE_PROVIDER ||
    (isSpringMode() ? 'backend-proxy' : 'supabase');

  switch (storageProvider) {
    case 'backend-proxy':
      console.log('[ServiceFactory] 🔒 Using Backend R2 Proxy provider (SECURE)');
      return new BackendR2ProxyProvider();
    case 'r2':
      console.log('[ServiceFactory] Using Direct Cloudflare R2 provider (DEV ONLY)');
      return new CloudflareR2Provider();
    case 'supabase':
    default:
      console.log('[ServiceFactory] Using Supabase storage provider');
      return new SupabaseStorageProvider();
  }
}

function createSupabaseServices(): ServiceContainer {
  // Create StorageService with appropriate storage provider
  const storageService = new StorageService(getStorageProvider());

  return {
    auth: supabaseAuthService,
    interventions: supabaseInterventionsService,
    users: supabaseUsersService,
    dispatch: supabaseDispatchService,
    payment: supabasePaymentService,
    quotes: supabaseQuotesService,
    ratings: supabaseRatingsService,
    clientRatings: supabaseClientRatingsService,
    messages: supabaseMessagesService,
    schedule: supabaseScheduleService,
    technicians: supabaseTechniciansService,
    services: supabaseServicesService,
    history: supabaseHistoryService,
    photos: supabasePhotosService,
    workPhotos: supabaseWorkPhotosService,
    revenue: supabaseRevenueService,
    statistics: supabaseStatisticsService,
    siteStats: supabaseSiteStatsService,
    configuration: supabaseConfigurationService,
    cancellation: supabaseCancellationService,
    partners: supabasePartnersService,
    roles: supabaseRolesService,
    performance: supabasePerformanceService,
    pricing: supabasePricingService,
    quoteModifications: supabaseQuoteModificationsService,
    realtime: supabaseRealtimeService,
    questionnaire: supabaseQuestionnaireService,
    storage: storageService,
    invoice: supabaseInvoiceService,
    notifications: supabaseNotificationsService,
    authOperations: supabaseAuthOperationsService,
    notificationPreferences: supabaseNotificationPreferencesService,
    payouts: supabasePayoutsService,
    siteSettings: supabaseSiteSettingsService,
    technicianPosition: supabaseTechnicianPositionService,
    eligibleTechnicians: supabaseEligibleTechniciansService,
    disputes: supabaseDisputesService,
    adminStats: supabaseAdminStatsService,
    phoneVerification: supabasePhoneVerificationService,
    uploadDocument: supabaseUploadDocumentService,
    logging: loggingService,       // same singleton in both modes
    agentReceivers: supabaseAgentReceiverService,
    whatsappAgents: supabaseWhatsAppAgentsService,
    zoneDeploy: supabaseZoneDeployService,
    affiliates: supabaseAffiliateService,
    affiliateCampaign: supabaseAffiliateCampaignService,
    articles: supabaseArticlesService,
    escalations: supabaseEscalationsService,
    b2b: supabaseB2bService,
  };
}

function createSpringServices(): ServiceContainer {
  // Create StorageService with appropriate storage provider
  const storageService = new StorageService(getStorageProvider());

  return {
    auth: new SpringAuthService(),
    interventions: new SpringInterventionsService(),
    users: new SpringUsersService(),
    dispatch: new SpringDispatchService(),
    payment: new SpringPaymentService(),
    quotes: new SpringQuotesService(),
    ratings: new SpringRatingsService(),
    clientRatings: new SpringClientRatingsService(),
    messages: new SpringMessagesService(),
    schedule: new SpringScheduleService(),
    technicians: new SpringTechniciansService(),
    services: new SpringServicesService(),
    history: new SpringHistoryService(),
    photos: new SpringPhotosService(),
    workPhotos: new SpringWorkPhotosService(),
    revenue: new SpringRevenueService(),
    statistics: new SpringStatisticsService(),
    siteStats: new SpringSiteStatsService(),
    configuration: new SpringConfigurationService(),
    cancellation: new SpringCancellationService(),
    partners: new SpringPartnersService(),
    roles: new SpringRolesService(),
    performance: new SpringPerformanceService(),
    pricing: new SpringPricingService(),
    quoteModifications: new SpringQuoteModificationsService(),
    realtime: new SpringRealtimeService(),
    questionnaire: new SpringQuestionnaireService(),
    storage: storageService,
    invoice: new SpringInvoiceService(),
    notifications: new SpringNotificationsService(),
    authOperations: new SpringAuthOperationsService(),
    notificationPreferences: new SpringNotificationPreferencesService(),
    payouts: new SpringPayoutsService(),
    siteSettings: new SpringSiteSettingsService(),
    technicianPosition: new SpringTechnicianPositionService(),
    eligibleTechnicians: new SpringEligibleTechniciansService(),
    disputes: new SpringDisputesService(),
    adminStats: new SpringAdminStatsService(),
    phoneVerification: new SpringPhoneVerificationService(),
    uploadDocument: springUploadDocumentService,
    logging: loggingService,       // same singleton in both modes
    agentReceivers: new SpringAgentReceiverService(),
    whatsappAgents: new SpringWhatsAppAgentsService(),
    zoneDeploy: new SpringZoneDeployService(),
    affiliates: new SpringAffiliateService(),
    affiliateCampaign: new SpringAffiliateCampaignService(),
    articles: new SpringArticlesService(),
    escalations: new SpringEscalationsService(),
    b2b: new SpringB2bService(),
  };
}

// Create the service container based on current mode
export const services: ServiceContainer = isSpringMode()
  ? createSpringServices()
  : createSupabaseServices();

// Re-export individual services for backward compatibility
// Components can continue importing from their original locations
// OR use `services.auth`, `services.interventions`, etc.
console.log(`[ServiceFactory] Running in ${isSpringMode() ? 'Spring' : 'Supabase'} mode`);
