/**
 * Template: Notify Manager After Job Technician
 * Sent to managers/admins when a technician submits a partnership application.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface NotifyManagerAfterJobTechnicianData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName: string;
  siren: string;
  apeCode: string;
  skills: string[];
}

const SKILL_LABELS: Record<string, string> = {
  locksmith: "Serrurerie",
  plumbing: "Plomberie",
  electricity: "Électricité",
  glazing: "Vitrerie",
  heating: "Chauffage",
  aircon: "Climatisation",
};

export function buildNotifyManagerAfterJobTechnicianHtml(
  data: NotifyManagerAfterJobTechnicianData
): { subject: string; html: string } {
  const { firstName, lastName, email, phone, companyName, siren, apeCode, skills } = data;

  const skillsList = (skills && skills.length > 0)
    ? skills.map((s) => `<span style="display:inline-block;background:#ecfdf5;color:#065f46;border:1px solid #0FB87F;border-radius:999px;padding:4px 10px;margin:2px;font-size:12px;font-weight:600;">${SKILL_LABELS[s] || s}</span>`).join(" ")
    : `<em style="color:#6b7280;">Aucune spécialité renseignée</em>`;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151; margin: 0 0 16px;">
      Bonjour,
    </p>

    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px;">
      Le technicien <strong>${firstName || ""} ${lastName || ""}</strong> vient de candidater sur Depan.Pro.
    </p>

    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;margin:16px 0;">
      <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;width:140px;">Société</td><td style="padding:10px 14px;color:#111827;font-size:14px;font-weight:600;">${companyName || "-"}</td></tr>
      <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;">Email</td><td style="padding:10px 14px;color:#111827;font-size:14px;font-weight:600;">${email ? `<a href="mailto:${email}" style="color:#0FB87F;text-decoration:none;">${email}</a>` : "-"}</td></tr>
      <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;">Téléphone</td><td style="padding:10px 14px;color:#111827;font-size:14px;font-weight:600;">${phone ? `<a href="tel:${phone}" style="color:#0FB87F;text-decoration:none;">${phone}</a>` : "-"}</td></tr>
      <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;">SIREN</td><td style="padding:10px 14px;color:#111827;font-size:14px;font-weight:600;">${siren || "-"}</td></tr>
      <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;">Code APE</td><td style="padding:10px 14px;color:#111827;font-size:14px;font-weight:600;">${apeCode || "-"}</td></tr>
    </table>

    <p style="font-size:14px;color:#374151;margin:16px 0 8px;font-weight:600;">Spécialités :</p>
    <div style="margin-bottom:20px;">${skillsList}</div>

    <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 20px 0 0;">
      Vous avez la main pour contrôler sa candidature et revenir dans les plus brefs délais au client !
    </p>

    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
      L'équipe Depan.Pro
    </p>
  `;

  return {
    subject: `Depan.Pro : Nouvelle candidature technicien — ${firstName || ""} ${lastName || ""}`.trim(),
    html: wrapInBaseLayout({
      headerTitle: "Nouvelle candidature technicien",
      headerSubtitle: `${firstName || ""} ${lastName || ""}`.trim(),
      headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
      bodyContent,
    }),
  };
}
