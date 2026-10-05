import {
  Intervention,
  InterventionFormData,
  InterventionStatus,
  InterventionCategory,
  InterventionGeoView,
  InterventionTechDashboardView,
  InterventionTechnicianView,
  InterventionAdminView,
  InterventionClientView,
  InterventionStatsView,
  InterventionQuestionnaireData,
  InterventionQuoteSignature,
  InterventionInvoiceSignature,
  InterventionStatusHistoryEntry,
  UpdateInterventionPayload,
} from '@/types/intervention.types';
import type { PaginatedResponse } from '@/types/pagination.types';

export interface IInterventionsService {

  // ============================================================
  // ✅ HELPERS OPTIMISÉS - Endpoints spécialisés et type-safe
  // ============================================================

  /**
   * Récupère interventions pour geo-filtering PUR (calculs de distance)
   *
   * 📊 Optimisation: SELECT id, status, createdAt, latitude, longitude ONLY
   * 📉 Réduction: 1,02 Mo → 0,05 Mo (-95%)
   *
   * @example
   * const nearby = await services.interventions.getInterventionsForGeoFilter({
   *   status: 'new'
   * });
   */
  getInterventionsForGeoFilter(filters: {
    status?: InterventionStatus | InterventionStatus[];
    technicianId?: string;
    page?: number;
    size?: number;
  }): Promise<InterventionGeoView[]>;

   /**
    * Récupère interventions pour dashboard technician (LeftSectionTech)
    * Combine geo-filtering + affichage UI complet (past + new interventions)
    *
    * 📊 Optimisation: SELECT id, status, createdAt, latitude, longitude, title, category, city, postalCode, estimatedPrice, address, clientPhone
    * 📉 Réduction: 1,02 Mo → 0,2 Mo (-80%)
    *
    * @example
    * const dashboard = await services.interventions.getInterventionsForTechDashboard({
    *   technicianId: user.id,
    *   status: ['completed', 'cancelled']
    * });
    */
   getInterventionsForTechDashboard(filters: {
     status?: InterventionStatus | InterventionStatus[];
     technicianId?: string;
     page?: number;
     size?: number;
   }): Promise<InterventionTechDashboardView[]>;

   /**
    * Récupère interventions pour dashboard technician (InterventionTech)
    * Utilisé par HeaderTechnician et InterventionTable
    * Combine tous les champs nécessaires pour recherche + tableau + filtrage
    *
    * 📊 Optimisation: SELECT id, title, category, status, city, createdAt, finalPrice, estimatedPrice, trackingCode ONLY
    * 📉 Réduction: 1,02 Mo → 0,2 Mo (-80%)
    *
    * @example
    * const interventions = await services.interventions.getInterventionsForTechnicianView({
    *   technicianId: user.id
    * });
    */
   getInterventionsForTechnicianView(filters: {
     technicianId?: string;
     page?: number;
     size?: number;
   }): Promise<InterventionTechnicianView[]>;

  /**
   * Récupère interventions pour liste admin avec pagination
   *
   * 📊 Optimisation: SELECT id, title, category, address, city, postalCode, clientId, technicianId, status, createdAt ONLY
   * 📉 Réduction: 1,02 Mo → 0,2 Mo (-80%)
   *
   * @example
   * const result = await services.interventions.getInterventionsForAdmin({
   *   status: 'new',
   *   search: 'Serrurerie Paris',
   *   page: 0,
   *   size: 20
   * });
   */
  getInterventionsForAdmin(filters: {
    status?: InterventionStatus;
    category?: InterventionCategory;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<InterventionAdminView>>;

  /**
   * Récupère interventions pour historique client
   *
   * 📊 Optimisation: SELECT id, title, category, status, priority, city, createdAt ONLY
   * 📉 Réduction: 1,02 Mo → 0,08 Mo (-92%)
   *
   * @example
   * const interventions = await services.interventions.getInterventionsForClient({
   *   clientId: 'user-123'
   * });
   */
  getInterventionsForClient(filters: {
    clientId: string;
    status?: InterventionStatus;
    page?: number;
    size?: number;
  }): Promise<InterventionClientView[]>;

  /**
   * Récupère interventions pour statistiques (AdminDashboard)
   *
   * 📊 Optimisation: SELECT id, status, createdAt, category ONLY
   * 📉 Réduction: 1,02 Mo → 0,03 Mo (-97%)
   *
   * @example
   * const stats = await services.interventions.getInterventionsForStats();
   */
  getInterventionsForStats(): Promise<InterventionStatsView[]>;

  // ============================================================
  // ✅ AUTRES MÉTHODES EXISTANTES
  // ============================================================

  getInterventions(filters?: {
    status?: InterventionStatus | InterventionStatus[];
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
    unassignedOnly?: boolean;
    orderBy?: ('createdAt' | 'priority' | 'updatedAt')[];
    orderDirection?: ('asc' | 'desc')[];
    page?: number;
    size?: number;
  }): Promise<Intervention[] | PaginatedResponse<Intervention>>;
  getIntervention(id: string): Promise<Intervention | null>;
  createIntervention(
    clientId: string | null,
    formData: InterventionFormData,
    questionnaireData?: InterventionQuestionnaireData
  ): Promise<Intervention>;
  updateStatus(id: string, status: InterventionStatus, oldStatus?: InterventionStatus): Promise<void>;
  /**
   * Édition admin/manager (statut, urgence, planification, adresse, contact,
   * bénéficiaire, technicien, prestations + prix). Règles de domaine validées côté serveur.
   */
  updateIntervention(id: string, payload: UpdateInterventionPayload): Promise<void>;
  assignTechnician(id: string, technicianId: string): Promise<void>;
  /** Définir/augmenter le plafond de prix B2B (ADMIN/MANAGER). */
  updateB2bPriceCap(id: string, b2bPriceCap: number | null): Promise<Intervention>;
  toggleActive(id: string, isActive: boolean): Promise<void>;
  cancelIntervention(id: string, reason: string): Promise<void>;

  // New methods for tracking and quote details
  getInterventionByTrackingCode(trackingCode: string): Promise<Intervention | null>;
  getInterventionQuoteDetails(interventionId: string): Promise<{
    quotes: Array<{ label: string; calculated_price: number }>;
    modifications: Array<{ total_additional_amount: number }>;
  }>;

  /**
   * Get the status change history (intervention_history_status)
   * for an intervention, ordered from most recent to oldest.
   * @param interventionId - The intervention ID
   */
  getInterventionStatusHistory(interventionId: string): Promise<InterventionStatusHistoryEntry[]>;

  /**
   * Update the signature for an intervention (quote signed)
   * @param interventionId - The intervention ID
   * @param signatureData - Base64 signature data
   */
  updateQuoteInterventionSignature(interventionId: string, signatureData: string): Promise<void>;

  /**
     * Update the final price for an intervention (after finalization)
     * @param interventionId - The intervention ID
     * @param estimatedPrice - The estimated amount charged (TTC)
     */
  updateEstimatedPrice(interventionId: string, estimatedPrice: number): Promise<void>;

  /**
   * Mark an intervention as finalized with signature and final price
   * @param interventionId - The intervention ID
   * @param finalPrice - The final amount charged (TTC)
   * @param signatureData - Base64 signature data
   */
  finalized(interventionId: string, finalPrice: number, signatureData: string): Promise<void>;

  /**
   * Schedule an intervention with a date, time and optionally assign a technician
   * @param interventionId - The intervention ID
   * @param scheduledAt - The scheduled date and time (ISO string)
   * @param technicianId - Optional technician ID to assign
   */
  scheduleIntervention(interventionId: string, scheduledAt: string, technicianId?: string): Promise<void>;

  /**
   * Get the active/in-progress intervention for a technician
   * Returns the single intervention currently being worked on
   * Statuses: assigned, on_route, arrived, in_progress
   * @param technicianId - The technician ID
   * @returns The active intervention or null if none
   */
  getInProgressInterventionForTechnician(technicianId: string): Promise<Intervention | null>;

   /**
    * Get new interventions that have NOT been declined by a technician
    * Combines status='new' + exclusion of declined interventions in one backend call
    *
    * 📊 Optimisation: 1 appel backend au lieu de 2 + filtrage frontend
    *
    * @example
    * const interventions = await services.interventions
    *   .getNewInterventionNotDeclinedByTechnician('tech-123');
    */
   getNewInterventionNotDeclinedByTechnician(technicianId: string): Promise<InterventionTechDashboardView[]>;

   /**
    * Delete an intervention permanently
    * ⚠️ IRREVERSIBLE ACTION - Only allowed for non-completed interventions
    *
    * @param interventionId - The intervention ID to delete
    * @throws Error if intervention is completed or already deleted
    *
    * @example
    * await services.interventions.deleteIntervention('interv-123');
    */
   deleteIntervention(interventionId: string): Promise<void>;

   /**
    * Get the quote signature for an intervention
    */
   getQuoteSignature(interventionId: string): Promise<InterventionQuoteSignature>;

   /**
    * Get the invoice signature for an intervention
    */
   getInvoiceSignature(interventionId: string): Promise<InterventionInvoiceSignature>;

   suspendIntervention(interventionId: string, data: { reason: string; expectedCompletionDate: string }): Promise<void>;

   resumeIntervention(interventionId: string): Promise<void>;

   getSuspendedInterventionsForTechnician(technicianId: string): Promise<Intervention[]>;
}
