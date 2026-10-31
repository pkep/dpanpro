/**
 * Fenêtre de facturation mensuelle B2B : mois calendaire complet (Europe/Paris).
 */

export function firstDayOfMonth(ym: string): string {
  return `${ym}-01`;
}

export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

export function monthLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

/** Vrai si `date` est le dernier jour de son mois (Europe/Paris). */
export function isLastDayOfMonthParis(date: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const [y, m, d] = fmt.format(date).split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d === last;
}

/** Nom de fichier daté « dd-MM-yyyy » à partir d'une date « YYYY-MM-DD ». */
export function fileDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}-${m}-${y}`;
}

/** Slug sûr pour un nom de société. */
export function slug(name: string | null | undefined): string {
  const s = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "");
  return s || "b2b";
}

/** Chemin de stockage de la facture mensuelle. */
export function b2bInvoicePath(companyName: string | null, partnerId: string, periodEnd: string): string {
  const shortId = partnerId.slice(0, 8);
  return `b2b/${slug(companyName)}-${shortId}/invoice-${fileDate(periodEnd)}.pdf`;
}
