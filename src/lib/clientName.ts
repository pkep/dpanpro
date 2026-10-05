/**
 * Résolution du nom client pour les **devis / factures**.
 *
 * Priorité :
 *   1. compte client (`users`) ;
 *   2. contact du partenaire B2B ;
 *   3. contact saisi sur l'intervention (`clientFirstName/clientLastName`) — invité ;
 *   4. fallback.
 *
 * Permet à un client invité (sans compte) d'avoir un devis/facture nominatif,
 * et à une intervention B2B d'utiliser le contact du partenaire.
 */
export interface ClientNameInput {
  accountFirstName?: string | null;
  accountLastName?: string | null;
  b2bContactFirstName?: string | null;
  b2bContactLastName?: string | null;
  clientFirstName?: string | null;
  clientLastName?: string | null;
}

function join(first?: string | null, last?: string | null): string {
  return `${(first ?? '').trim()} ${(last ?? '').trim()}`.trim();
}

export function resolveClientName(input: ClientNameInput, fallback = 'Client'): string {
  const account = join(input.accountFirstName, input.accountLastName);
  if (account) return account;

  const b2b = join(input.b2bContactFirstName, input.b2bContactLastName);
  if (b2b) return b2b;

  const contact = join(input.clientFirstName, input.clientLastName);
  if (contact) return contact;

  return fallback;
}
