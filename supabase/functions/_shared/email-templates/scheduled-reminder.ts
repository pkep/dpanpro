/**
 * Template: Scheduled Intervention Reminder (Technician, T-2h)
 * Used by: notify-scheduled-reminder
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface ScheduledReminderTemplateData {
  technicianFirstName: string;
  interventionTitle: string;
  interventionAddress: string;
  interventionCity: string;
  interventionPostalCode: string;
  scheduledAt: string;
  trackingCode: string;
  trackingUrl: string;
}

export function buildScheduledReminderEmail(
  data: ScheduledReminderTemplateData,
): { subject: string; html: string } {
  const date = new Date(data.scheduledAt);
  const dateStr = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${data.technicianFirstName},</p>
    <p style="font-size: 16px; color: #374151;">
      Votre intervention planifiée commence dans <strong>environ 2 heures</strong>.
      Préparez votre matériel et votre trajet.
    </p>
    <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 4px 0; color: #92400e;"><strong>📋 Intervention :</strong> ${data.interventionTitle}</p>
      <p style="margin: 4px 0; color: #92400e;"><strong>📅 Date :</strong> ${dateStr} à ${timeStr}</p>
      <p style="margin: 4px 0; color: #92400e;"><strong>📍 Adresse :</strong> ${data.interventionAddress}, ${data.interventionPostalCode} ${data.interventionCity}</p>
      <p style="margin: 4px 0; color: #92400e;"><strong>🔖 Référence :</strong> ${data.trackingCode}</p>
    </div>
    <p style="font-size: 14px; color: #374151;">
      À partir de maintenant, cette intervention apparaît comme assignée dans votre planning.
      Vous ne pouvez plus accepter de nouvelle mission tant qu'elle n'est pas terminée.
    </p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${data.trackingUrl}" style="background:#0FB87F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Ouvrir l'intervention
      </a>
    </p>
  `;

  return {
    subject: `Depan.Pro : Rappel - Intervention dans 2h - ${data.trackingCode}`,
    html: wrapInBaseLayout({
      headerTitle: "⏰ Intervention dans 2h",
      headerSubtitle: data.interventionTitle,
      headerBgColor: "#f59e0b",
      bodyContent,
    }),
  };
}
