import type { INotificationsService, WelcomeNotificationInput, TechnicianApplicationNotificationInput } from '@/services/interfaces/notifications.interface';
import { springHttp } from './http-client';

export class SpringNotificationsService implements INotificationsService {
  // POST /notifications/welcome-admin
  async sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void> {
    await springHttp.post('/notifications/welcome-admin', input);
  }

  // POST /notifications/technician-application
  async notifyTechnicianApplication(input: TechnicianApplicationNotificationInput): Promise<void> {
    await springHttp.post('/notifications/technician-application', input);
  }
}
