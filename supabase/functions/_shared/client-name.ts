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
  return join(input.accountFirstName, input.accountLastName)
    || join(input.b2bContactFirstName, input.b2bContactLastName)
    || join(input.clientFirstName, input.clientLastName)
    || fallback;
}