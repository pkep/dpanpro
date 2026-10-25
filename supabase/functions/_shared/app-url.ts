/**
 * Liens partagés des Edge Functions.
 *
 * Les liens envoyés aux utilisateurs (emails, SMS) doivent pointer vers le
 * front-end publié, jamais vers l'hôte des fonctions : FRONTEND_URL est
 * l'origine publique configurée et `/auth` est la route de connexion de l'appli.
 */

const DEFAULT_SITE_URL = "https://dpanpro.lovable.app";

/** Origine publique du site (sans slash final). */
export function getSiteUrl(): string {
  return Deno.env.get("FRONTEND_URL") || DEFAULT_SITE_URL;
}

/** URL absolue d'un chemin de l'appli, ex. buildAppUrl("/verify-email?token=…"). */
export function buildAppUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** URL de la page de connexion (route `/auth`). */
export function buildLoginUrl(): string {
  return buildAppUrl("/auth");
}
