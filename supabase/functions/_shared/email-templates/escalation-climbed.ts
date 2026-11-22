/**
 * Template: Escalation Climbed Notification Emails
 * Used by: notify-escalation-climbed-internal, notify-escalation-climbed-external
 *
 * Une escalade « montée » signifie que l'intervention initiale a été reprise :
 *  - en interne  : un autre technicien Dépan.Pro prend le relais ;
 *  - en externe  : le dossier est confié à une société partenaire extérieure.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

export interface EscalationClimbedIntervention {
  id: string;
  title: string | null;
  trackingCode: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

interface CommonTemplateOptions {
  intervention: EscalationClimbedIntervention;
  baseUrl: string;
}

export interface EscalationClimbedInternalTemplateOptions extends CommonTemplateOptions {
  technicianName?: string | null;
}

export interface EscalationClimbedExternalTemplateOptions extends CommonTemplateOptions {
  companyName?: string | null;
}

export interface EscalationClimbedEmail {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ligne « libellé / valeur » du bloc de détails ; ignorée si la valeur est vide. */
function detailRow(label: string, value: string | null | undefined): string {
  const text = (value ?? "").toString().trim();
  if (!text) return "";
  return `
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 110px;">${label}</td>
          <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${escapeHtml(text)}</td>
        </tr>`;
}

function detailsBlock(intervention: EscalationClimbedIntervention): string {
  const addressLine = [intervention.address, intervention.postalCode, intervention.city]
    .filter((part) => (part ?? "").toString().trim())
    .join(", ");

  return `
    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">📋 Détails de l'intervention</h3>
      <table style="width: 100%; font-size: 14px;">${detailRow("Référence", intervention.trackingCode)
    }${detailRow("Service", intervention.title)}${detailRow("Adresse", addressLine)}
      </table>
    </div>`;
}

function trackingButton(intervention: EscalationClimbedIntervention, baseUrl: string): string {
  if (!intervention.trackingCode) return "";
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${baseUrl}/track/${intervention.trackingCode}" style="background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        🔍 Suivre mon intervention
      </a>
    </div>`;
}

/**
 * Escalade interne : un nouveau technicien Dépan.Pro prend le relais.
 * Le nom du technicien n'est pas toujours connu au moment de l'escalade.
 */
export function buildEscalationClimbedInternalEmailHtml(
  options: EscalationClimbedInternalTemplateOptions,
): EscalationClimbedEmail {
  const { intervention, technicianName, baseUrl } = options;
  const ref = intervention.trackingCode ?? "";
  const technician = (technicianName ?? "").toString().trim();

  const bodyContent = `
    <div style="background: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 18px; color: #0369a1; font-weight: 600;">
        Votre demande a été reprise en interne
      </p>
    </div>

    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Bonjour,
    </p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Votre intervention${ref ? ` <strong>${escapeHtml(ref)}</strong>` : ""} a été escaladée et
      un nouveau technicien Dépan.Pro prend le relais
      ${technician ? `: <strong>${escapeHtml(technician)}</strong>` : ""}.
      Nous revenons vers vous très vite pour confirmer l'intervention.
    </p>

    ${detailsBlock(intervention)}
    ${trackingButton(intervention, baseUrl)}
  `;

  return {
    subject: `Depan.Pro — Votre intervention${ref ? ` ${ref}` : ""} a été reprise`,
    html: wrapInBaseLayout({
      headerTitle: "🔧 Un nouveau technicien prend le relais",
      headerSubtitle: ref || undefined,
      bodyContent,
    }),
  };
}

/**
 * Escalade externe : le dossier est confié à une société partenaire extérieure.
 * Le nom de la société peut être inconnu au moment de la création de l'escalade.
 */
export function buildEscalationClimbedExternalEmailHtml(
  options: EscalationClimbedExternalTemplateOptions,
): EscalationClimbedEmail {
  const { intervention, companyName, baseUrl } = options;
  const ref = intervention.trackingCode ?? "";
  const partner = (companyName ?? "").toString().trim();

  const bodyContent = `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 18px; color: #b45309; font-weight: 600;">
        Votre demande est prise en charge par un partenaire
      </p>
    </div>

    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Bonjour,
    </p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
      Votre intervention${ref ? ` <strong>${escapeHtml(ref)}</strong>` : ""} a été escaladée et
      confiée à
      ${partner ? `notre société partenaire <strong>${escapeHtml(partner)}</strong>` : "l'une de nos sociétés partenaires"}
      afin d'assurer le dépannage dans les meilleurs délais.
      Nous restons à vos côtés pour le suivi de votre dossier.
    </p>

    ${detailsBlock(intervention)}
    ${trackingButton(intervention, baseUrl)}
  `;

  return {
    subject: `Depan.Pro — Votre intervention${ref ? ` ${ref}` : ""} est prise en charge par un partenaire`,
    html: wrapInBaseLayout({
      headerTitle: "🤝 Prise en charge par un partenaire",
      headerSubtitle: ref || undefined,
      bodyContent,
    }),
  };
}
