/**
 * Template: Technician Assigned to Scheduled Intervention (Client Notification)
 * Used by: notify-technician-assigned
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface TechnicianAssignedTemplateData {
  clientFirstName: string;
  technicianFirstName: string;
  technicianLastName: string;
  interventionTitle: string;
  interventionAddress: string;
  interventionCity: string;
  interventionPostalCode: string;
  scheduledAt: string; // ISO
  trackingCode: string;
  trackingUrl: string;
}

export function buildTechnicianAssignedEmail(
  data: TechnicianAssignedTemplateData,
): { subject: string; html: string } {
  const date = new Date(data.scheduledAt);
  const dateStr = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${data.clientFirstName},</p>
    <p style="font-size: 16px; color: #374151;">
      Bonne nouvelle ! Un technicien a été assigné à votre intervention planifiée.
    </p>
    <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0FB87F;">
      <p style="margin: 4px 0; color: #065f46;"><strong>👷 Technicien :</strong> ${data.technicianFirstName} ${data.technicianLastName}</p>
      <p style="margin: 4px 0; color: #065f46;"><strong>📅 Date :</strong> ${dateStr} à ${timeStr}</p>
      <p style="margin: 4px 0; color: #065f46;"><strong>📍 Adresse :</strong> ${data.interventionAddress}, ${data.interventionPostalCode} ${data.interventionCity}</p>
      <p style="margin: 4px 0; color: #065f46;"><strong>🔖 Référence :</strong> ${data.trackingCode}</p>
    </div>
    <p style="font-size: 14px; color: #374151;">
      Vous serez notifié à nouveau quand le technicien sera en route.
    </p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${data.trackingUrl}" style="background:#0FB87F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Suivre mon intervention
      </a>
    </p>
  `;

  return {
    subject: `Depan.Pro : Technicien assigné pour votre intervention - ${data.trackingCode}`,
    html: wrapInBaseLayout({
      headerTitle: "✅ Technicien assigné",
      headerSubtitle: data.interventionTitle,
      headerBgColor: "#0FB87F",
      bodyContent,
    }),
  };
}
