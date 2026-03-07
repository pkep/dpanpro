/**
 * Template: Technician Dispatch Notification Email
 * Used by: notify-technician-dispatch
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface TechnicianDispatchTemplateData {
  firstName: string;
  categoryLabel: string;
  address: string;
  postalCode: string;
  city: string;
  priorityLabel: string;
  isUrgent: boolean;
}

export function buildTechnicianDispatchEmailHtml(data: TechnicianDispatchTemplateData): string {
  const { firstName, categoryLabel, address, postalCode, city, priorityLabel, isUrgent } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour <strong>${firstName}</strong>,</p>
    
    <p style="font-size: 16px; color: #374151;">Une nouvelle mission vous est proposée :</p>
    
    <div style="background: #f8fafc; border-left: 4px solid ${isUrgent ? '#ef4444' : '#0FB87F'}; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937;">${categoryLabel}</h2>
      <p style="margin: 8px 0; color: #6b7280;">
        <strong>📍 Adresse :</strong> ${address}<br>
        ${postalCode} ${city}
      </p>
      <p style="margin: 8px 0; color: #6b7280;">
        <strong>Priorité :</strong> ${priorityLabel}
      </p>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <p style="font-size: 14px; color: #6b7280;">
        Ouvrez l'application Depan.Pro pour voir les détails et accepter cette mission.
      </p>
    </div>
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      Vous avez 5 minutes pour répondre avant que la mission ne soit proposée à un autre technicien.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: isUrgent ? "🚨 MISSION URGENTE" : "📋 Nouvelle Mission",
    headerBgColor: isUrgent ? "#ef4444" : undefined,
    bodyContent,
  });
}
