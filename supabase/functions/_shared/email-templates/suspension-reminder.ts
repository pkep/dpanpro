/**
 * Template: Suspension Reminder Email (J-3 / J-2 / J-1)
 * Used by: send-suspension-reminders
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface SuspensionReminderTemplateData {
  firstName: string;
  interventionTitle: string;
  address: string;
  postalCode: string;
  city: string;
  suspensionReason: string | null;
  expectedDate: string;
  trackingCode: string | null;
  trackingUrl: string;
  daysRemaining: number;
}

export function buildSuspensionReminderEmail(
  data: SuspensionReminderTemplateData,
): { subject: string; html: string } {
  const whenLabel = data.daysRemaining === 1 ? "demain" : `dans ${data.daysRemaining} jours`;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${data.firstName || ""},</p>
    <p style="font-size: 16px; color: #374151;">
      Votre intervention est suspendue. La reprise est prévue <strong>${data.expectedDate}</strong> (${whenLabel}).
    </p>
    ${
      data.suspensionReason
        ? `<p style="font-size: 14px; color: #6b7280;"><strong>Message du support :</strong> ${data.suspensionReason}</p>`
        : ""
    }
    <div style="background: #fef3c2; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 4px 0; color: #92400e;"><strong>&#128203; Intervention :</strong> ${data.interventionTitle}</p>
      <p style="margin: 4px 0; color: #92400e;"><strong>&#128205; Adresse :</strong> ${data.address}, ${data.postalCode} ${data.city}</p>
      ${data.trackingCode ? `<p style="margin: 4px 0; color: #92400e;"><strong>&#128278; Référence :</strong> ${data.trackingCode}</p>` : ""}
      <p style="margin: 4px 0; color: #92400e;"><strong>&#128197; Reprise prévue :</strong> ${data.expectedDate}</p>
    </div>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${data.trackingUrl}" style="background:#f59e0b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Reprendre l'intervention
      </a>
    </p>
  `;

  return {
    subject: `Depan.Pro : Rappel intervention suspendue (${whenLabel})`,
    html: wrapInBaseLayout({
      headerTitle: "&#9208;&#65039; Intervention suspendue",
      headerSubtitle: data.interventionTitle,
      headerBgColor: "#f59e0b",
      bodyContent,
    }),
  };
}
