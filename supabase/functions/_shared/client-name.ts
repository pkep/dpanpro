/**
 * Résolution du nom client pour les devis / factures (edge functions).
 *
 * Priorité :
 *   1. compte client (`users`) ;
 *   2. contact du partenaire B2B ;
 *   3. contact saisi sur l'intervention (`client_first_name/last_name`) — invité ;
 *   4. fallback.
 */

export interface ResolveClientNameInput {
  accountFirstName?: string | null;
  accountLastName?: string | null;
  b2bContactFirstName?: string | null;
  b2bContactLastName?: string | null;
  clientFirstName?: string | null;
  clientLastName?: string | null;
}

function join(first?: string | null, last?: string | null): string {
  return `${(first ?? "").trim()} ${(last ?? "").trim()}`.trim();
}

export function resolveClientName(input: ResolveClientNameInput, fallback = "Client"): string {
  const account = join(input.accountFirstName, input.accountLastName);
  if (account) return account;

  const b2b = join(input.b2bContactFirstName, input.b2bContactLastName);
  if (b2b) return b2b;

  const contact = join(input.clientFirstName, input.clientLastName);
  if (contact) return contact;

  return fallback;
}
