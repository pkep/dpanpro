/**
 * Template: Technician Dispatch Notification Email
 * Used by: notify-technician-dispatch
 */

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

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${isUrgent ? '#ef4444' : '#3b82f6'}; color: white; padding: 20px; text-align: center;">
        <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 40px; margin-bottom: 10px;" />
        <h1 style="margin: 0;">${isUrgent ? '🚨 MISSION URGENTE' : '📋 Nouvelle Mission'}</h1>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <p style="font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
        
        <p style="font-size: 16px;">Une nouvelle mission vous est proposée :</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${isUrgent ? '#ef4444' : '#3b82f6'};">
          <h2 style="margin-top: 0; color: #1f2937;">${categoryLabel}</h2>
          <p style="margin: 8px 0; color: #6b7280;">
            <strong>📍 Adresse:</strong> ${address}<br>
            ${postalCode} ${city}
          </p>
          <p style="margin: 8px 0; color: #6b7280;">
            <strong>Priorité:</strong> ${priorityLabel}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 14px; color: #6b7280;">
            Ouvrez l'application Depan.Pro pour voir les détails et accepter cette mission.
          </p>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">
          Vous avez 5 minutes pour répondre avant que la mission ne soit proposée à un autre technicien.
        </p>
      </div>
      
      <div style="background: #1f2937; color: white; padding: 15px; text-align: center;">
        <p style="margin: 0; font-size: 12px;">Depan.Pro - Votre partenaire dépannage</p>
      </div>
    </div>
  `;
}
