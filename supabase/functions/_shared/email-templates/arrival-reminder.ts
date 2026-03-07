/**
 * Template: Technician Arrival Reminder Email
 * Used by: send-technician-arrival-reminder
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface ArrivalReminderTemplateData {
  firstName: string;
  reminderType: "half_time" | "five_minutes";
  elapsedMinutes: number;
  remainingMinutes: number;
  targetTimeMinutes: number;
  address: string;
  city: string;
  interventionTitle: string;
}

export function buildArrivalReminderEmail(data: ArrivalReminderTemplateData): { subject: string; html: string } {
  const { firstName, reminderType, elapsedMinutes, remainingMinutes, targetTimeMinutes, address, city, interventionTitle } = data;

  if (reminderType === "half_time") {
    const bodyContent = `
      <p style="font-size: 16px; color: #374151;">Bonjour ${firstName},</p>
      <p style="font-size: 16px; color: #374151;">Vous avez accepté l'intervention il y a <strong>${elapsedMinutes} minutes</strong>.</p>
      <p style="font-size: 16px; color: #374151;">Il vous reste environ <strong>${remainingMinutes} minutes</strong> pour atteindre le temps cible de ${targetTimeMinutes} minutes.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #374151;"><strong>📍 Adresse :</strong> ${address}, ${city}</p>
      </div>
      <p style="font-size: 14px; color: #374151;">Merci de respecter les délais promis au client.</p>
    `;

    return {
      subject: `Rappel - Mi-parcours: ${interventionTitle}`,
      html: wrapInBaseLayout({
        headerTitle: `⏱️ Rappel mi-parcours`,
        headerSubtitle: interventionTitle,
        headerBgColor: "#f59e0b",
        bodyContent,
      }),
    };
  }

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${firstName},</p>
    <p style="font-size: 16px; color: #374151;"><strong>Il ne vous reste que 5 minutes</strong> pour atteindre le temps cible de ${targetTimeMinutes} minutes.</p>
    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0; color: #991b1b;"><strong>📍 Adresse :</strong> ${address}, ${city}</p>
    </div>
    <p style="font-size: 14px; color: #374151;">Le client vous attend. Merci de faire au plus vite.</p>
  `;

  return {
    subject: `⚠️ Urgent - 5 min restantes: ${interventionTitle}`,
    html: wrapInBaseLayout({
      headerTitle: "⚠️ Urgent - 5 min restantes",
      headerSubtitle: interventionTitle,
      headerBgColor: "#ef4444",
      bodyContent,
    }),
  };
}
