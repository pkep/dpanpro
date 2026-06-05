/**
 * Template: Welcome Job Technician
 * Sent when a technician submits a partnership application.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface WelcomeJobTechnicianData {
  firstName: string;
  lastName: string;
}

export function buildWelcomeJobTechnicianHtml(data: WelcomeJobTechnicianData): {
  subject: string;
  html: string;
} {
  const { firstName, lastName } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
      Bonjour ${lastName || ""} ${firstName || ""},
    </p>

    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px;">
      Merci pour l'intérêt que vous portez à <strong>Depan.Pro</strong>, nous allons vous recontacter dans les plus brefs délais.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      À très bientôt,<br>
      L'équipe Depan.Pro
    </p>
  `;

  return {
    subject: "Depan.Pro : Nous avons bien reçu votre candidature",
    html: wrapInBaseLayout({
      headerTitle: `Bienvenue ${firstName || ""} !`,
      headerSubtitle: "Votre candidature a bien été reçue",
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
