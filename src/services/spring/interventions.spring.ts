import type { IInterventionsService } from '@/services/interfaces/interventions.interface';
import type { Intervention, InterventionFormData, InterventionStatus, InterventionCategory } from '@/types/intervention.types';
import { springHttp } from './http-client';

export class SpringInterventionsService implements IInterventionsService {
  // GET /interventions?status=&category=&clientId=&technicianId=&isActive=&page=&size=
  async getInterventions(filters?: {
    status?: InterventionStatus;
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
  }): Promise<Intervention[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.category) params.category = filters.category;
    if (filters?.clientId) params.clientId = filters.clientId;
    if (filters?.technicianId) params.technicianId = filters.technicianId;
    if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);
    const page = await springHttp.get<{ content: Intervention[] }>('/interventions', params);
    return page.content;
  }

  // GET /interventions/{id}
  async getIntervention(id: string): Promise<Intervention | null> {
    return springHttp.get<Intervention | null>(`/interventions/${id}`);
  }

  // POST /interventions
  async createIntervention(clientId: string | null, formData: InterventionFormData, questionnaireData?: any): Promise<Intervention> {
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

  // PATCH /interventions/{id}/active (field: active)
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await springHttp.patch(`/interventions/${id}/active`, { active: isActive });
  }

  // POST /interventions/{id}/cancel
  async cancelIntervention(id: string, reason: string): Promise<void> {
    await springHttp.post(`/interventions/${id}/cancel`, { reason });
  }

  // GET /interventions/track/{trackingCode} (public)
  async getByTrackingCode(trackingCode: string): Promise<Intervention | null> {
    return springHttp.get<Intervention | null>(`/interventions/track/${trackingCode}`);
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
  async updateIntervention(id: string, updates: Record<string, unknown>): Promise<void> {
    await springHttp.patch(`/interventions/${id}`, updates);
  }
}
