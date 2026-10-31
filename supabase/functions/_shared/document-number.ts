/** Numéros de devis/facture persistés et séquencés (fonction SQL next_document_number). */
export async function ensureDocumentNumber(
  supabase: any,
  interventionId: string,
  type: "quote" | "invoice",
): Promise<string> {
  const column = type === "quote" ? "quote_number" : "invoice_number";
  const { data: current } = await supabase
    .from("interventions")
    .select(column)
    .eq("id", interventionId)
    .maybeSingle();
  const existing = current?.[column];
  if (existing) return existing as string;

  const { data: number, error } = await supabase.rpc("next_document_number", { p_type: type });
  if (error) throw error;
  await supabase.from("interventions").update({ [column]: number }).eq("id", interventionId).is(column, null);

  const { data: stored } = await supabase
    .from("interventions")
    .select(column)
    .eq("id", interventionId)
    .maybeSingle();
  return (stored?.[column] as string) || (number as string);
}
