/**
 * Template: Technician reconnect reminder
 * Sent to inactive technicians to encourage reconnection and GPS activation.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

export interface TechnicianReconnectReminderData {
  firstName: string;
  loginUrl: string;
}

export function buildTechnicianReconnectReminderEmail(
  data: TechnicianReconnectReminderData,
): { subject: string; html: string } {
  const { firstName, loginUrl } = data;
  const subject = "Depan.Pro — Reconnectez-vous et activez votre position";

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px; font-weight: 600;">
      Bonjour ${firstName} !
    </h2>

    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
      Vous ne vous êtes pas connecté depuis plusieurs jours.
    </p>

    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
      Reconnectez-vous et autorisez la localisation pour recevoir les interventions
      proches de vous.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
        Me reconnecter
      </a>
    </div>

    <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center;">
      L'équipe Depan.Pro
    </p>
  `;

  return {
    subject,
    html: wrapInBaseLayout({
      headerTitle: "Reconnectez-vous",
      headerSubtitle: "Activez votre position",
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
