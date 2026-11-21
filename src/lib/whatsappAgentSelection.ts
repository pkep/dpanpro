export const WHATSAPP_AGENT_STORAGE_KEY = 'depanpro_whatsapp_agent_id';

export interface SelectableWhatsAppAgent {
  id: string;
}

/**
 * Garde l'agent déjà mémorisé s'il est encore actif, sinon en choisit un
 * aléatoirement. Retourne null si aucun agent n'est disponible.
 */
export function pickWhatsAppAgent<T extends SelectableWhatsAppAgent>(
  agents: T[],
  storedId: string | null | undefined,
  random: () => number = Math.random
): T | null {
  if (agents.length === 0) return null;

  const storedAgent = storedId
    ? agents.find((agent) => agent.id === storedId)
    : undefined;

  if (storedAgent) return storedAgent;

  const index = Math.min(
    agents.length - 1,
    Math.floor(random() * agents.length)
  );

  return agents[index] ?? null;
}
