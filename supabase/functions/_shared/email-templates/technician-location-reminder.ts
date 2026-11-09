/**
 * Template: Technician location reminder
 * Sent when an active technician has no GPS position.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

export interface TechnicianLocationReminderData {
  firstName: string;
  loginUrl: string;
}

export function buildTechnicianLocationReminderEmail(
  data: TechnicianLocationReminderData,
): { subject: string; html: string } {
  const { firstName, loginUrl } = data;
  const subject = "Depan.Pro — Activez votre position pour recevoir des interventions";

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px; font-weight: 600;">
      Bonjour ${firstName} !
    </h2>

    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
      Votre compte technicien n'a pas de position GPS enregistrée. Sans position,
      vous ne pouvez pas recevoir les interventions proches de vous.
    </p>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        Connectez-vous à la plateforme et autorisez la localisation dans votre navigateur.
      </p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
        Me connecter
      </a>
    </div>
  `;

  return {
    subject,
    html: wrapInBaseLayout({
      headerTitle: "Activez votre position",
      headerSubtitle: "Recevez les interventions proches de vous",
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
