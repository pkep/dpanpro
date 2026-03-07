/**
 * Template: Status Change Notification Email
 * Used by: notify-status-change
 */
import { wrapInBaseLayout } from "./base-layout.ts";

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  assigned: "Assigné",
  on_route: "En route",
  arrived: "Arrivé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_EMOJI: Record<string, string> = {
  assigned: "👨‍🔧",
  on_route: "🚗",
  arrived: "📍",
  in_progress: "🔧",
  completed: "✅",
  cancelled: "❌",
};

export { STATUS_LABELS, STATUS_EMOJI };

interface StatusChangeTemplateData {
  intervention: {
    title: string;
    tracking_code: string | null;
    address: string;
    city: string;
    id: string;
  };
  newStatus: string;
  statusMessage: string;
  baseUrl: string;
}

export function buildStatusChangeEmailHtml(data: StatusChangeTemplateData): string {
  const { intervention, newStatus, statusMessage, baseUrl } = data;

  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const emoji = STATUS_EMOJI[newStatus] || "📋";
  const trackingUrl = intervention.tracking_code
    ? `${baseUrl}/track/${intervention.tracking_code}`
    : `${baseUrl}/intervention/${intervention.tracking_code}`;

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    assigned: { bg: "#e0f2fe", border: "#0ea5e9", text: "#0369a1" },
    on_route: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
    in_progress: { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
    completed: { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
    cancelled: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
  };

  const colors = statusColors[newStatus] || statusColors.assigned;

  const ratingSection = newStatus === "completed"
    ? `
      <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
        <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 18px;">⭐ Votre avis compte !</h3>
        <p style="margin: 0 0 16px 0; color: #78350f; font-size: 14px;">
          Prenez un instant pour noter votre technicien et partager votre expérience.
        </p>
        <a href="${baseUrl}/intervention/${intervention.id}#rating" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px;">
          ⭐ Noter l'intervention
        </a>
      </div>
    `
    : "";

  const bodyContent = `
    <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 18px; color: ${colors.text}; font-weight: 600;">
        Nouveau statut : ${statusLabel}
      </p>
    </div>
    
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">${statusMessage}</p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">📋 Détails de l'intervention</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 100px;">Référence</td>
          <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${intervention.tracking_code || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Service</td>
          <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${intervention.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Adresse</td>
          <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${intervention.address}, ${intervention.city}</td>
        </tr>
      </table>
    </div>

    ${ratingSection}
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${trackingUrl}" style="background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        🔍 Suivre mon intervention
      </a>
    </div>
  `;

  return wrapInBaseLayout({
    headerTitle: `${emoji} Mise à jour de votre intervention`,
    headerSubtitle: intervention.tracking_code || undefined,
    bodyContent,
  });
}
