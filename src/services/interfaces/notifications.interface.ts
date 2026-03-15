export interface WelcomeNotificationInput {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  temporaryPassword: string;
}

export interface TechnicianApplicationNotificationInput {
  technicianId: string;
  action: 'accepted' | 'rejected';
  email: string;
  firstName: string;
  reason?: string;
}

export interface INotificationsService {
  sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void>;
  notifyTechnicianApplication(input: TechnicianApplicationNotificationInput): Promise<void>;
}
