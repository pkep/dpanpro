/**
 * Template: Manual Dispatch Notification Email
 * Used by: notify-manual-dispatch
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface ManualDispatchTemplateData {
  firstName: string;
  categoryLabel: string;
  address: string;
  postalCode: string;
  city: string;
}

export function buildManualDispatchEmailHtml(data: ManualDispatchTemplateData): string {
  const { firstName, categoryLabel, address, postalCode, city } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour <strong>${firstName}</strong>,</p>
    
    <p style="font-size: 16px; color: #374151;">Un manager vous a assigné une nouvelle mission :</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937;">${categoryLabel}</h2>
      <p style="margin: 0; color: #6b7280;">
        <strong>📍 Adresse :</strong> ${address}<br>
        ${postalCode} ${city}
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Cette mission vous a été directement assignée. Ouvrez l'application Depan.Pro pour voir tous les détails.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "📋 Mission Assignée",
    headerBgGradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    bodyContent,
  });
}
