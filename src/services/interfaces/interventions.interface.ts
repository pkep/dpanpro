import type { Intervention, InterventionFormData, InterventionStatus, InterventionCategory } from '@/types/intervention.types';

import type { PaginatedResponse } from '@/types/pagination.types';

export interface InterventionListFilters {
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
}

export interface IInterventionsService {
  getInterventions(filters?: InterventionListFilters & { page?: undefined; size?: undefined }): Promise<Intervention[]>;
  getInterventions(filters: InterventionListFilters & { page: number; size: number }): Promise<PaginatedResponse<Intervention>>;
  getInterventions(filters?: InterventionListFilters): Promise<Intervention[] | PaginatedResponse<Intervention>>;
  getIntervention(id: string): Promise<Intervention | null>;
  createIntervention(
    clientId: string | null,
    formData: InterventionFormData,
    questionnaireData?: {
      questionnaireAnswers?: string[];
      questionnaireResultName?: string;
      prixMin?: number | null;
      prixMax?: number | null;
    }
  ): Promise<Intervention>;
  updateStatus(id: string, status: InterventionStatus, oldStatus?: InterventionStatus): Promise<void>;
  assignTechnician(id: string, technicianId: string): Promise<void>;
  toggleActive(id: string, isActive: boolean): Promise<void>;
  cancelIntervention(id: string, reason: string): Promise<void>;
}
