/**
 * Template: Technician Arrival Reminder Email
 * Used by: send-technician-arrival-reminder
 */

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
    return {
      subject: `Rappel - Mi-parcours: ${interventionTitle}`,
      html: `
        <p>Bonjour ${firstName},</p>
        <p>Vous avez accepté l'intervention il y a <strong>${elapsedMinutes} minutes</strong>.</p>
        <p>Il vous reste environ <strong>${remainingMinutes} minutes</strong> pour atteindre le temps cible de ${targetTimeMinutes} minutes.</p>
        <p><strong>Adresse:</strong> ${address}, ${city}</p>
        <p>Merci de respecter les délais promis au client.</p>
      `,
    };
  }

  return {
    subject: `⚠️ Urgent - 5 min restantes: ${interventionTitle}`,
    html: `
      <p>Bonjour ${firstName},</p>
      <p><strong>Il ne vous reste que 5 minutes</strong> pour atteindre le temps cible de ${targetTimeMinutes} minutes.</p>
      <p><strong>Adresse:</strong> ${address}, ${city}</p>
      <p>Le client vous attend. Merci de faire au plus vite.</p>
    `,
  };
}
