import type { IInterventionsService } from '@/services/interfaces/interventions.interface';
import {
  Intervention,
  InterventionFormData,
  InterventionStatus,
  InterventionCategory,
  InterventionAdminView,
  InterventionClientView,
  InterventionGeoView,
  InterventionStatsView,
  InterventionTechDashboardView,
  InterventionTechnicianView,
  InterventionQuestionnaireData,
  InterventionQuoteSignature,
  InterventionInvoiceSignature,
  InterventionStatusHistoryEntry,
  UpdateInterventionPayload,
} from '@/types/intervention.types';
import type {PaginatedResponse} from '@/types/pagination.types';
import {springHttp} from './http-client';

export class SpringInterventionsService implements IInterventionsService {
    async getInterventionStatusHistory(interventionId: string): Promise<InterventionStatusHistoryEntry[]> {
        return springHttp.get<InterventionStatusHistoryEntry[]>(`/interventions/${interventionId}/status-history`);
    }

  // ============================================================
  // OPTIMIZED VIEW ENDPOINTS
  // ============================================================

  async getInterventionsForGeoFilter(filters: {
    status?: InterventionStatus | InterventionStatus[];
    technicianId?: string;
    page?: number;
    size?: number;
  }): Promise<InterventionGeoView[]> {
    const params: Record<string, string> = {};

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        params.status = filters.status.join(',');
      } else {
        params.status = filters.status;
      }
    }
    if (filters?.technicianId) params.technicianId = filters.technicianId;
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);

    return springHttp.get<InterventionGeoView[]>('/interventions/geo-filter', params);
  }

  async getInterventionsForTechDashboard(filters: {
    status?: InterventionStatus | InterventionStatus[];
    technicianId?: string;
    page?: number;
    size?: number;
  }): Promise<InterventionTechDashboardView[]> {
    const params: Record<string, string> = {};

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        params.status = filters.status.join(',');
      } else {
        params.status = filters.status;
      }
    }
    if (filters?.technicianId) params.technicianId = filters.technicianId;
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);

    return springHttp.get<InterventionTechDashboardView[]>('/interventions/tech-dashboard', params);
  }

  async getInterventionsForTechnicianView(filters: {
    technicianId?: string;
    page?: number;
    size?: number;
  }): Promise<InterventionTechnicianView[]> {
    const params: Record<string, string> = {};

    if (filters?.technicianId) params.technicianId = filters.technicianId;
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);

    return springHttp.get<InterventionTechnicianView[]>('/interventions/technician-view', params);
  }

  async getInterventionsForAdmin(filters: {
    status?: InterventionStatus;
    category?: InterventionCategory;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<InterventionAdminView>> {
    const params: Record<string, string> = {};
    if (filters?.status)   params.status   = filters.status;
    if (filters?.category) params.category = filters.category;
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);
    return springHttp.get<PaginatedResponse<InterventionAdminView>>('/interventions/admin-list', params);
  }

  async getInterventionsForClient(filters: {
    clientId: string;
    status?: InterventionStatus;
    page?: number;
    size?: number;
  }): Promise<InterventionClientView[]> {
    const params: Record<string, string> = {};

    params.clientId = filters.clientId;
    if (filters?.status) params.status = filters.status;
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);

    return springHttp.get<InterventionClientView[]>('/interventions/client-history', params);
  }

  async getInterventionsForStats(): Promise<InterventionStatsView[]> {
    return springHttp.get<InterventionStatsView[]>('/interventions/stats');
  }

  // ============================================================
  // CORE METHODS
  // ============================================================
  getInterventions(filters: {
    status?: InterventionStatus | InterventionStatus[];
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
    unassignedOnly?: boolean;
    orderBy?: ('createdAt' | 'priority' | 'updatedAt')[];
    orderDirection?: ('asc' | 'desc')[];
    page: number;
    size?: number;
  }): Promise<PaginatedResponse<Intervention>>;
  getInterventions(filters?: {
    status?: InterventionStatus | InterventionStatus[];
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
    unassignedOnly?: boolean;
    orderBy?: ('createdAt' | 'priority' | 'updatedAt')[];
    orderDirection?: ('asc' | 'desc')[];
    page?: undefined;
    size?: number;
  }): Promise<Intervention[]>;
  async getInterventions(filters?: {
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
  }): Promise<Intervention[] | PaginatedResponse<Intervention>> {
    const params: Record<string, string> = {};

    // Handle status filter: can be a single value or an array
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        params.status = filters.status.join(',');
      } else {
        params.status = filters.status;
      }
    }

    if (filters?.category) params.category = filters.category;
    if (filters?.clientId) params.clientId = filters.clientId;
    if (filters?.technicianId) params.technicianId = filters.technicianId;
    if (filters?.unassignedOnly !== undefined) params.unassignedOnly = String(filters.unassignedOnly);
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);

    // Handle multi-level ordering
    if (filters?.orderBy && filters.orderBy.length > 0) {
      params.orderBy = filters.orderBy.join(',');
    }
    if (filters?.orderDirection && filters.orderDirection.length > 0) {
      params.orderDirection = filters.orderDirection.join(',');
    }

    // Handle pagination
    if (filters?.page !== undefined) params.page = String(filters.page);
    if (filters?.size !== undefined) params.size = String(filters.size);

    // If pagination params provided, return paginated response
    if (filters?.page !== undefined && filters?.size !== undefined) {
      return springHttp.get<PaginatedResponse<Intervention>>('/interventions', params);
    }

    // Otherwise, maintain backward compatibility by returning just content array
    const page = await springHttp.get<{ content: Intervention[] }>('/interventions', params);
    return page.content;
  }

  // GET /interventions/{id}
  async getIntervention(id: string): Promise<Intervention | null> {
    return springHttp.get<Intervention | null>(`/interventions/${id}`);
  }

  // POST /interventions
  async createIntervention(clientId: string | null, formData: InterventionFormData, questionnaireData?: InterventionQuestionnaireData): Promise<Intervention> {
    return springHttp.post<Intervention>('/interventions', { clientId, ...formData, ...questionnaireData });
  }

  // PATCH /interventions/{id}/status
  async updateStatus(id: string, status: InterventionStatus, oldStatus?: InterventionStatus): Promise<void> {
    await springHttp.patch(`/interventions/${id}/status`, { status, oldStatus });
  }

  // POST /interventions/{id}/assign (changed from PATCH to POST)
  async assignTechnician(id: string, technicianId: string): Promise<void> {
    await springHttp.post(`/interventions/${id}/assign`, { technicianId });
  }

  // PATCH /interventions/{id}/b2b-price-cap
  async updateB2bPriceCap(id: string, b2bPriceCap: number | null): Promise<Intervention> {
    return springHttp.patch<Intervention>(`/interventions/${id}/b2b-price-cap`, { b2bPriceCap });
  }

  // PATCH /interventions/{id}/active (field: active)
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await springHttp.patch(`/interventions/${id}/active`, { active: isActive });
  }

  // POST /interventions/{id}/cancel
  async cancelIntervention(id: string, reason: string): Promise<void> {
    await springHttp.post(`/interventions/${id}/cancel`, { reason });
  }

  // GET /interventions/my
  async getMyInterventions(): Promise<Intervention[]> {
    const page = await springHttp.get<{ content: Intervention[] }>('/interventions/my');
    return page.content;
  }

  // GET /interventions/unassigned
  async getUnassignedInterventions(): Promise<Intervention[]> {
    const page = await springHttp.get<{ content: Intervention[] }>('/interventions/unassigned');
    return page.content;
  }

  // PATCH /interventions/{id}
  async updateIntervention(id: string, payload: UpdateInterventionPayload): Promise<void> {
    await springHttp.patch(`/interventions/${id}`, payload);
  }

  // PATCH /interventions/{id}/signature
  async updateQuoteInterventionSignature(interventionId: string, signatureData: string): Promise<void> {
    await springHttp.patch(`/interventions/${interventionId}/quote-signature`, { signatureData });
  }

  // PATCH /interventions/{id}/finalized
  async finalized(interventionId: string, finalPrice: number, signatureData: string): Promise<void> {
    await springHttp.patch(`/interventions/${interventionId}/finalized`, {
        status: 'completed',
        finalPrice,
        invoiceSignature : signatureData,
        invoiceSignatureDate: new Date().toISOString()
        });
  }

// PATCH /interventions/{id}/estimated-price·
  async updateEstimatedPrice(interventionId: string, estimatedPrice: number): Promise<void> {
    await springHttp.patch(`/interventions/${interventionId}/estimated-price`, { estimatedPrice });
  }

  // PATCH /interventions/{id}/schedule
  async scheduleIntervention(interventionId: string, scheduledAt: string, technicianId?: string): Promise<void> {
    await springHttp.patch(`/interventions/${interventionId}/schedule`, {
      scheduledAt,
      technicianId: technicianId || null,
    });
  }

  // GET /interventions/technician/{technicianId}/in-progress
  async getInProgressInterventionForTechnician(technicianId: string): Promise<Intervention | null> {
    try {
      return await springHttp.get<Intervention | null>(
        `/interventions/technician/${technicianId}/in-progress`
      );
    } catch {
      return null;
    }
  }

  // GET /interventions/new/not-declined/{technicianId}
  async getNewInterventionNotDeclinedByTechnician(technicianId: string): Promise<InterventionTechDashboardView[]> {
    try {
      return await springHttp.get<InterventionTechDashboardView[]>(
        `/interventions/new/not-declined/${technicianId}`
      );
    } catch {
      return [];
    }
  }

  // GET /interventions/{id}/quote-details
  async getInterventionQuoteDetails(interventionId: string): Promise<{
    quotes: Array<{ label: string; calculated_price: number }>;
    modifications: Array<{ total_additional_amount: number }>;
  }> {
    return springHttp.get(`/interventions/${interventionId}/quote-details`);
  }

   // GET /interventions/track/{trackingCode}
   async getInterventionByTrackingCode(trackingCode: string): Promise<Intervention | null> {
     return springHttp.get<Intervention | null>(`/interventions/track/${trackingCode}`);
   }

   // DELETE /interventions/{id}
   async deleteIntervention(interventionId: string): Promise<void> {
     await springHttp.delete(`/interventions/${interventionId}`);
   }

  // GET /interventions/{id}/quote-signature
  async getQuoteSignature(interventionId: string): Promise<InterventionQuoteSignature> {
    return springHttp.get<InterventionQuoteSignature>(`/interventions/${interventionId}/quote-signature`);
  }

  // GET /interventions/{id}/invoice-signature
  async getInvoiceSignature(interventionId: string): Promise<InterventionInvoiceSignature> {
    return springHttp.get<InterventionInvoiceSignature>(`/interventions/${interventionId}/invoice-signature`);
  }

  async suspendIntervention(interventionId: string, data: { reason: string; expectedCompletionDate: string }): Promise<void> {
    await springHttp.post(`/interventions/${interventionId}/suspend`, data);
  }

  async resumeIntervention(interventionId: string): Promise<void> {
    await springHttp.post(`/interventions/${interventionId}/resume`);
  }

  async getSuspendedInterventionsForTechnician(technicianId: string): Promise<Intervention[]> {
    return springHttp.get<Intervention[]>(`/interventions/technician/${technicianId}/suspended`);
  }
}
