export interface WelcomeNotificationInput {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  temporaryPassword: string;
}

export interface TechnicianApplicationNotificationInput {
  technicianId: string;
  action: 'accepted' | 'approved' | 'rejected' | 'qualification' | 'activated';
  email: string;
  firstName: string;
  reason?: string;
}

export interface INotificationsService {
  sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void>;
  notifyTechnicianApplication(input: TechnicianApplicationNotificationInput): Promise<void>;
  notifyNewIntervention(interventionId: string): Promise<void>;
  /** Email de bienvenue au technicien dont la candidature vient d'être déposée. */
  notifyWelcomeJobTechnician(technicianId: string): Promise<void>;
  /** Alerté les admins qu'une nouvelle candidature technicien est à traiter. */
  notifyManagerAfterJobTechnician(technicianId: string): Promise<void>;
}
