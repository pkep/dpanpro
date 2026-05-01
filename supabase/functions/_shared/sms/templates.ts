/**
 * SMS Message Templates
 * Centralizes all SMS message content for Depan.Pro.
 * Each function returns the SMS body string.
 */

const PREFIX = "Depan.Pro:";

// ── Status Change ──────────────────────────────────────────────────
interface StatusChangeSmsData {
  emoji: string;
  statusMessage: string;
  trackingCode: string | null;
  trackingUrl: string;
  interventionId: string;
  baseUrl: string;
  isCompleted: boolean;
}

export function buildStatusChangeSms(data: StatusChangeSmsData): string {
  const ratingPrompt = data.isCompleted
    ? ` Notez votre experience: ${data.baseUrl}/intervention/${data.interventionId}#rating`
    : "";

  return `${data.emoji} ${PREFIX} ${data.statusMessage}. Ref: ${data.trackingCode || "N/A"}.${ratingPrompt} Suivez: ${data.trackingUrl}`;
}

// ── Quote Modification ─────────────────────────────────────────────
interface QuoteModificationSmsData {
  totalAdditionalAmount: number;
  approvalUrl: string;
}

export function buildQuoteModificationSms(data: QuoteModificationSmsData): string {
  return `${PREFIX} Le technicien propose ${data.totalAdditionalAmount.toFixed(2)}€ de prestations supplementaires pour votre intervention. Validez ici: ${data.approvalUrl}`;
}

// ── Quote Signed ────────────────────────────────────────────────────
interface QuoteSignedSmsData {
  trackingCode: string;
}

export function buildQuoteSignedSms(data: QuoteSignedSmsData): string {
  return `${PREFIX} Votre devis a été validé et signé. L'intervention est en cours. Ref: ${data.trackingCode}`;
}

// ── Cancellation Invoice ────────────────────────────────────────────
interface CancellationInvoiceSmsData {
  invoiceNumber: string;
  trackingCode: string;
  totalTTC: number;
}

export function buildCancellationInvoiceSms(data: CancellationInvoiceSmsData): string {
  return `${PREFIX} Facture d'annulation ${data.invoiceNumber}. Suite à l'annulation de l'intervention ${data.trackingCode} après l'arrivée du technicien, un montant de ${data.totalTTC.toFixed(2)} € TTC vous est facturé. Facture envoyée par email.`;
}

// ── Payment Required ────────────────────────────────────────────────
interface PaymentRequiredSmsData {
  trackingCode: string;
  trackingUrl: string;
  paymentUrl: string;
}

export function buildPaymentRequiredSms(data: PaymentRequiredSmsData): string {
  return `${PREFIX} autorisation de paiement requise.\nUne action est requise pour avancer dans l'intervention. Cliquer pour procéder au paiement: ${data.paymentUrl}\n\nPour suivre le étape de l'intervention ouvrez: ${data.trackingUrl}\nCode: ${data.trackingCode}`;
}

// ── Manual Dispatch (technician) ────────────────────────────────────
interface ManualDispatchSmsData {
  categoryLabel: string;
  city: string;
  address: string;
}

export function buildManualDispatchSms(data: ManualDispatchSmsData): string {
  return `${PREFIX} Mission assignee par le manager: ${data.categoryLabel} a ${data.city}. ${data.address}. Ouvrez l'app pour voir les details.`;
}

// ── Technician Dispatch ─────────────────────────────────────────────
interface TechnicianDispatchSmsData {
  categoryLabel: string;
  city: string;
  address: string;
  postalCode: string;
  isUrgent: boolean;
  acceptanceUrl: string;
}

export function buildTechnicianDispatchSms(data: TechnicianDispatchSmsData): string {
  const urgentPrefix = data.isUrgent ? "URGENT - " : "";
  return `${urgentPrefix}${PREFIX} Nouvelle mission ${data.categoryLabel} a ${data.city}. ${data.address}, ${data.postalCode}. \nCliquez sur le lien pour accepter l'intervention: ${data.acceptanceUrl}.`;
}

// ── Payment Captured (technician confirmation) ──────────────────────
interface PaymentCapturedSmsData {
  amount: string;
  interventionTitle: string;
}

export function buildPaymentCapturedSms(data: PaymentCapturedSmsData): string {
  return `${PREFIX} Paiement de ${data.amount} € confirmé pour l'intervention ${data.interventionTitle}.`;
}

// ── Payment Authorized (technician) ─────────────────────────────────
interface PaymentAuthorizedTechSmsData {
  trackingCode: string;
  categoryLabel: string;
  city: string;
}

export function buildPaymentAuthorizedTechSms(data: PaymentAuthorizedTechSmsData): string {
  return `✅ ${PREFIX} Le client a autorisé le paiement pour l'intervention ${data.categoryLabel} à ${data.city}. Ref: ${data.trackingCode}. Vous pouvez reprendre l'intervention.`;
}

// ── Arrival Reminder (technician) ───────────────────────────────────
interface ArrivalReminderSmsData {
  reminderType: "half_time" | "five_minutes";
  remainingMinutes: number;
  targetTimeMinutes: number;
  address: string;
  city: string;
}

export function buildArrivalReminderSms(data: ArrivalReminderSmsData): string {
  if (data.reminderType === "half_time") {
    return `⏰ Rappel: Il vous reste ${data.remainingMinutes} min pour arriver chez le client (${data.address}, ${data.city}). Objectif: ${data.targetTimeMinutes} min.`;
  }
  return `🚨 URGENT: Plus que 5 min pour arriver chez le client! (${data.address}, ${data.city}). Le client vous attend.`;
}
