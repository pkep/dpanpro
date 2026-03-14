export interface WelcomeNotificationInput {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  temporaryPassword: string;
}

export interface INotificationsService {
  sendWelcomeAdmin(input: WelcomeNotificationInput): Promise<void>;
}
