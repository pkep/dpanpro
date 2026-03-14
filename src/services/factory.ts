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
import { messagesService as supabaseMessagesService } from '@/services/supabase/messages.service';
import { scheduleService as supabaseScheduleService } from '@/services/supabase/schedule.service';
import { techniciansService as supabaseTechniciansService } from '@/services/supabase/technicians.service';
import { servicesService as supabaseServicesService } from '@/services/supabase/services.service';
import { historyService as supabaseHistoryService } from '@/services/supabase/history.service';
import { photosService as supabasePhotosService } from '@/services/supabase/photos.service';
import { workPhotosService as supabaseWorkPhotosService } from '@/services/supabase/work-photos.service';
import { revenueService as supabaseRevenueService } from '@/services/supabase/revenue.service';
import { statisticsService as supabaseStatisticsService } from '@/services/supabase/statistics.service';
import { configurationService as supabaseConfigurationService } from '@/services/supabase/configuration.service';
import { cancellationService as supabaseCancellationService } from '@/services/supabase/cancellation.service';
import { partnersService as supabasePartnersService } from '@/services/supabase/partners.service';
import { rolesService as supabaseRolesService } from '@/services/supabase/roles.service';
import { performanceService as supabasePerformanceService } from '@/services/supabase/performance.service';
import { pricingService as supabasePricingService } from '@/services/supabase/pricing.service';
import { quoteModificationsService as supabaseQuoteModificationsService } from '@/services/supabase/quote-modifications.service';
import { payoutsService as supabasePayoutsService } from '@/services/supabase/payouts.service';
import { disputesService as supabaseDisputesService } from '@/services/supabase/disputes.service';
import { siteSettingsService as supabaseSiteSettingsService } from '@/services/supabase/site-settings.service';
import { notificationsService as supabaseNotificationsService } from '@/services/supabase/notifications.service';
import { geocodingService as supabaseGeocodingService } from '@/services/components/geocoding/geocoding.service';
import { questionnaireService as supabaseQuestionnaireService } from '@/services/components/questionnaire/questionnaire.service';
import { invoiceService as supabaseInvoiceService } from '@/services/components/invoice/invoice.service';
import { storageService as supabaseStorageService } from '@/services/components/utils/storage/storage.service';

// --- Spring implementations ---
import { SpringAuthService } from '@/services/spring/auth.spring';
import { SpringInterventionsService } from '@/services/spring/interventions.spring';
import { SpringUsersService } from '@/services/spring/users.spring';
import { SpringDispatchService } from '@/services/spring/dispatch.spring';
import { SpringPaymentService } from '@/services/spring/payment.spring';
import { SpringQuotesService } from '@/services/spring/quotes.spring';
import { SpringRatingsService } from '@/services/spring/ratings.spring';
import { SpringMessagesService } from '@/services/spring/messages.spring';
import { SpringScheduleService } from '@/services/spring/schedule.spring';
import { SpringTechniciansService } from '@/services/spring/technicians.spring';
import { SpringServicesService } from '@/services/spring/services.spring';
import { SpringHistoryService } from '@/services/spring/history.spring';
import { SpringPhotosService } from '@/services/spring/photos.spring';
import { SpringWorkPhotosService } from '@/services/spring/work-photos.spring';
import { SpringRevenueService } from '@/services/spring/revenue.spring';
import { SpringStatisticsService } from '@/services/spring/statistics.spring';
import { SpringConfigurationService } from '@/services/spring/configuration.spring';
import { SpringCancellationService } from '@/services/spring/cancellation.spring';
import { SpringPartnersService } from '@/services/spring/partners.spring';
import { SpringRolesService } from '@/services/spring/roles.spring';
import { SpringPerformanceService } from '@/services/spring/performance.spring';
import { SpringPricingService } from '@/services/spring/pricing.spring';
import { SpringQuoteModificationsService } from '@/services/spring/quote-modifications.spring';
import { SpringPayoutsService } from '@/services/spring/payouts.spring';
import { SpringDisputesService } from '@/services/spring/disputes.spring';
import { SpringSiteSettingsService } from '@/services/spring/site-settings.spring';
import { SpringNotificationsService } from '@/services/spring/notifications.spring';
import { SpringStorageService } from '@/services/spring/storage.spring';
import { SpringGeocodingService } from '@/services/spring/geocoding.spring';
import { SpringQuestionnaireService } from '@/services/spring/questionnaire.spring';
import { SpringInvoiceService } from '@/services/spring/invoice.spring';

// --- Interfaces ---
import type { IAuthService } from '@/services/interfaces/auth.interface';
import type { IInterventionsService } from '@/services/interfaces/interventions.interface';
import type { IUsersService } from '@/services/interfaces/users.interface';
import type { IDispatchService } from '@/services/interfaces/dispatch.interface';
import type { IPaymentService } from '@/services/interfaces/payment.interface';
import type { IQuotesService } from '@/services/interfaces/quotes.interface';
import type { IRatingsService } from '@/services/interfaces/ratings.interface';
import type { IMessagesService } from '@/services/interfaces/messages.interface';
import type { IScheduleService } from '@/services/interfaces/schedule.interface';
import type { ITechniciansService } from '@/services/interfaces/technicians.interface';
import type { IServicesService } from '@/services/interfaces/services.interface';
import type { IHistoryService } from '@/services/interfaces/history.interface';
import type { IPhotosService } from '@/services/interfaces/photos.interface';
import type { IWorkPhotosService } from '@/services/interfaces/work-photos.interface';
import type { IRevenueService } from '@/services/interfaces/revenue.interface';
import type { IStatisticsService } from '@/services/interfaces/statistics.interface';
import type { IConfigurationService } from '@/services/interfaces/configuration.interface';
import type { ICancellationService } from '@/services/interfaces/cancellation.interface';
import type { IPartnersService } from '@/services/interfaces/partners.interface';
import type { IRolesService } from '@/services/interfaces/roles.interface';
import type { IPerformanceService } from '@/services/interfaces/performance.interface';
import type { IPricingService } from '@/services/interfaces/pricing.interface';
import type { IQuoteModificationsService } from '@/services/interfaces/quote-modifications.interface';
import type { IPayoutsService } from '@/services/interfaces/payouts.interface';
import type { IDisputesService } from '@/services/interfaces/disputes.interface';
import type { ISiteSettingsService } from '@/services/interfaces/site-settings.interface';
import type { INotificationsService } from '@/services/interfaces/notifications.interface';
import type { IStorageService } from '@/services/interfaces/storage.interface';
import type { IGeocodingService } from '@/services/interfaces/geocoding.interface';
import type { IQuestionnaireService } from '@/services/interfaces/questionnaire.interface';
import type { IInvoiceService } from '@/services/interfaces/invoice.interface';

export interface ServiceContainer {
  auth: IAuthService;
  interventions: IInterventionsService;
  users: IUsersService;
  dispatch: IDispatchService;
  payment: IPaymentService;
  quotes: IQuotesService;
  ratings: IRatingsService;
  messages: IMessagesService;
  schedule: IScheduleService;
  technicians: ITechniciansService;
  services: IServicesService;
  history: IHistoryService;
  photos: IPhotosService;
  workPhotos: IWorkPhotosService;
  revenue: IRevenueService;
  statistics: IStatisticsService;
  configuration: IConfigurationService;
  cancellation: ICancellationService;
  partners: IPartnersService;
  roles: IRolesService;
  performance: IPerformanceService;
  pricing: IPricingService;
  quoteModifications: IQuoteModificationsService;
  payouts: IPayoutsService;
  disputes: IDisputesService;
  siteSettings: ISiteSettingsService;
  notifications: INotificationsService;
  storage: IStorageService;
  geocoding: IGeocodingService;
  questionnaire: IQuestionnaireService;
  invoice: IInvoiceService;
}

function createSupabaseServices(): ServiceContainer {
  return {
    auth: supabaseAuthService,
    interventions: supabaseInterventionsService,
    users: supabaseUsersService,
    dispatch: supabaseDispatchService,
    payment: supabasePaymentService,
    quotes: supabaseQuotesService,
    ratings: supabaseRatingsService,
    messages: supabaseMessagesService,
    schedule: supabaseScheduleService,
    technicians: supabaseTechniciansService,
    services: supabaseServicesService,
    history: supabaseHistoryService,
    photos: supabasePhotosService,
    workPhotos: supabaseWorkPhotosService,
    revenue: supabaseRevenueService,
    statistics: supabaseStatisticsService,
    configuration: supabaseConfigurationService,
    cancellation: supabaseCancellationService,
    partners: supabasePartnersService,
    roles: supabaseRolesService,
    performance: supabasePerformanceService,
    pricing: supabasePricingService,
    quoteModifications: supabaseQuoteModificationsService,
    payouts: supabasePayoutsService,
    disputes: supabaseDisputesService,
    siteSettings: supabaseSiteSettingsService,
    notifications: supabaseNotificationsService,
    storage: supabaseStorageService,
    geocoding: supabaseGeocodingService,
    questionnaire: supabaseQuestionnaireService,
    invoice: supabaseInvoiceService,
  };
}

function createSpringServices(): ServiceContainer {
  return {
    auth: new SpringAuthService(),
    interventions: new SpringInterventionsService(),
    users: new SpringUsersService(),
    dispatch: new SpringDispatchService(),
    payment: new SpringPaymentService(),
    quotes: supabaseQuotesService, // Quotes has client-side pricing logic, keep Supabase
    ratings: new SpringRatingsService(),
    messages: new SpringMessagesService(),
    schedule: new SpringScheduleService(),
    technicians: new SpringTechniciansService(),
    services: new SpringServicesService(),
    history: new SpringHistoryService(),
    photos: new SpringPhotosService(),
    workPhotos: new SpringWorkPhotosService(),
    revenue: new SpringRevenueService(),
    statistics: new SpringStatisticsService(),
    configuration: new SpringConfigurationService(),
    cancellation: new SpringCancellationService(),
    partners: new SpringPartnersService(),
    roles: new SpringRolesService(),
    performance: new SpringPerformanceService(),
    pricing: new SpringPricingService(),
    quoteModifications: new SpringQuoteModificationsService(),
    payouts: new SpringPayoutsService(),
    disputes: new SpringDisputesService(),
    siteSettings: new SpringSiteSettingsService(),
    notifications: new SpringNotificationsService(),
    storage: new SpringStorageService(),
    geocoding: new SpringGeocodingService(),
    questionnaire: new SpringQuestionnaireService(),
    invoice: new SpringInvoiceService(),
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
