/**
 * Template: Notify New Intervention
 * Sent to client after intervention creation to reassure them.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface NotifyNewInterventionData {
  domain: string;
}

export function buildNotifyNewInterventionHtml(
  data: NotifyNewInterventionData
): { subject: string; html: string } {
  const { domain } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
      Bonjour,
    </p>

    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px;">
      Merci de nous faire confiance, un technicien <strong>${domain}</strong> sera bientôt en charge de votre intervention et prendra contact avec vous si besoin.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      L'équipe Depan.Pro
    </p>
  `;

  return {
    subject: `Depan.Pro : Votre demande d'intervention ${domain} est bien prise en compte`,
    html: wrapInBaseLayout({
      headerTitle: "Votre intervention est prise en compte",
      headerSubtitle: domain,
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
