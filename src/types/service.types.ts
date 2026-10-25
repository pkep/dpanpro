/**
 * Types partagés des services de notification (emails, SMS, push).
 *
 * Les entrées déjà contractualisées restent définies dans
 * `services/interfaces/notifications.interface` et sont ré-exposées ici pour
 * que les implémentations n'aient qu'une seule source de vérité.
 */

export type {
  WelcomeNotificationInput,
  TechnicianApplicationNotificationInput,
} from '@/services/interfaces/notifications.interface';

/** Ligne de `notification_settings` (matrice événement × canal). */
export interface NotificationSetting {
  id: string;
  eventType: string;
  channel: string;
  isEnabled: boolean;
  applicableRoles: string[];
  description: string | null;
}

/** `send-invoice-email` : la fonction recharge l'intervention et sa facture. */
export interface SendInvoiceEmailInput {
  interventionId: string;
}

/** `send-quote-email` : la fonction régénère le PDF du devis puis l'envoie. */
export interface SendQuoteEmailInput {
  interventionId: string;
}

/** `send-contact-email` : message du formulaire de contact, reçu par contact@depan.pro. */
export interface SendContactEmailInput {
  profileType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
}
