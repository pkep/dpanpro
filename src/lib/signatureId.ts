/**
 * Référence unique de signature.
 *
 * Générée côté frontend **avant** l'affichage de la boîte de signature, affichée
 * au client, puis persistée avec la signature (devis, facture, avenant,
 * consentement d'escalade). Format : `SIG-<uuid>`.
 */
export function newSignatureId(): string {
  return `SIG-${crypto.randomUUID()}`;
}
