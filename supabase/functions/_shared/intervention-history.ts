/**
 * Shared Intervention Status History Recorder
 * Insère une entrée dans intervention_history_status à chaque changement
 * de statut d'intervention. Utilisé par les Edge Functions qui modifient
 * le statut (dispatch-intervention, batch-activate-scheduled, ...).
 */

/**
 * Enregistre un changement de statut d'intervention.
 *
 * @param supabase - Client Supabase (Anon/Service Role)
 * @param interventionId - UUID de l'intervention
 * @param status - Nouveau statut (new, dispatching, assigned, on_route,
 *                 arrived, in_progress, completed, cancelled)
 * @returns Résultat de l'insertion (pour log/erreur le cas échéant)
 */
export async function recordInterventionStatusChange(
  supabase: any,
  interventionId: string,
  status: string,
): Promise<{ error: any; data: any }> {
  // Règle : ignorer si le statut est identique au précédent
  const { data: last } = await supabase
    .from("intervention_history_status")
    .select("status")
    .eq("intervention_id", interventionId)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.status === status) {
    console.log(`[StatusHistory] Skipped duplicate ${status} for intervention ${interventionId}`);
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from("intervention_history_status")
    .insert({
      intervention_id: interventionId,
      status,
      changed_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`[StatusHistory] Failed to record ${status} for intervention ${interventionId}:`, error);
  } else {
    console.log(`[StatusHistory] Recorded ${status} for intervention ${interventionId}`);
  }

  return { data, error };
}
