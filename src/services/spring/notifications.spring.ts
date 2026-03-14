import type { INotificationsService, WelcomeNotificationInput } from '@/services/interfaces/notifications.interface';
import { springHttp } from './http-client';

export class SpringNotificationsService implements INotificationsService {
  // POST /notifications/welcome-admin
  async sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void> {
    await springHttp.post('/notifications/welcome-admin', input);
  }
}
