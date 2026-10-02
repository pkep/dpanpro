import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * B2B : le client final (bénéficiaire) n'est PAS notre client direct.
 * Aucune communication (email/SMS/push) ne doit lui être envoyée.
 *
 * Retourne `true` si l'intervention est une intervention B2B.
 */
export async function isB2bIntervention(
  supabase: SupabaseClient,
  interventionId: string | null | undefined,
): Promise<boolean> {
  if (!interventionId) return false;
  const { data, error } = await supabase
    .from("interventions")
    .select("billing_type")
    .eq("id", interventionId)
    .maybeSingle();
  if (error) {
    console.error("[b2b-guard] failed to read billing_type:", error);
    return false;
  }
  return (data as { billing_type?: string } | null)?.billing_type === "b2b";
}

/** Réponse standard quand une notification client est silenciée (B2B). */
export function b2bSkippedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: true, skipped: "b2b" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
