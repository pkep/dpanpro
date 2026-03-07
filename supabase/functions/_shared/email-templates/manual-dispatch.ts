/**
 * Template: Manual Dispatch Notification Email
 * Used by: notify-manual-dispatch
 */

interface ManualDispatchTemplateData {
  firstName: string;
  categoryLabel: string;
  address: string;
  postalCode: string;
  city: string;
}

export function buildManualDispatchEmailHtml(data: ManualDispatchTemplateData): string {
  const { firstName, categoryLabel, address, postalCode, city } = data;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 40px; margin-bottom: 10px;" />
        <h1 style="margin: 0;">📋 Mission Assignée</h1>
      </div>
      
      <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Bonjour <strong>${firstName}</strong>,</p>
        
        <p style="font-size: 16px;">Un manager vous a assigné une nouvelle mission :</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
          <h2 style="margin-top: 0; color: #1f2937;">${categoryLabel}</h2>
          <p style="margin: 8px 0; color: #6b7280;">
            <strong>📍 Adresse:</strong> ${address}<br>
            ${postalCode} ${city}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">
          Cette mission vous a été directement assignée par un manager. 
          Ouvrez l'application Depan.Pro pour voir tous les détails.
        </p>
      </div>
      
      <div style="background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 8px; margin-top: 10px;">
        <p style="margin: 0; font-size: 12px;">Depan.Pro - Votre partenaire dépannage</p>
      </div>
    </div>
  `;
}
