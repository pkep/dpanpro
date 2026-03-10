import type { IInterventionsService } from '@/services/interfaces/interventions.interface';
import type { Intervention, InterventionFormData, InterventionStatus, InterventionCategory } from '@/types/intervention.types';
import { springHttp } from './http-client';

export class SpringInterventionsService implements IInterventionsService {
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
    return springHttp.get<Intervention[]>('/interventions', params);
  }

  async getIntervention(id: string): Promise<Intervention | null> {
    return springHttp.get<Intervention | null>(`/interventions/${id}`);
  }

  async createIntervention(clientId: string | null, formData: InterventionFormData, questionnaireData?: any): Promise<Intervention> {
    return springHttp.post<Intervention>('/interventions', { clientId, ...formData, ...questionnaireData });
  }

  async updateStatus(id: string, status: InterventionStatus, oldStatus?: InterventionStatus): Promise<void> {
    await springHttp.patch(`/interventions/${id}/status`, { status, oldStatus });
  }

  async assignTechnician(id: string, technicianId: string): Promise<void> {
    await springHttp.patch(`/interventions/${id}/assign`, { technicianId });
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await springHttp.patch(`/interventions/${id}/active`, { isActive });
  }

  async cancelIntervention(id: string, reason: string): Promise<void> {
    await springHttp.post(`/interventions/${id}/cancel`, { reason });
  }
}
