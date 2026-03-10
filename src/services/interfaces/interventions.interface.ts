import type { Intervention, InterventionFormData, InterventionStatus, InterventionCategory } from '@/types/intervention.types';

export interface IInterventionsService {
  getInterventions(filters?: {
    status?: InterventionStatus;
    category?: InterventionCategory;
    clientId?: string;
    technicianId?: string;
    isActive?: boolean;
  }): Promise<Intervention[]>;
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
