import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildInvoiceEmailHtml } from "../_shared/email-templates/invoice-email.ts";
import { sendClientEmail } from "../_shared/notify/send.ts";

const INTERVENTION_ID = "595964fb-2dbb-4f5c-b7a7-2ac822a7a3fa";
const RECIPIENT = "kpaulimus@depan.pro";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Backend configuration unavailable");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: invoice, error: invoiceError } = await supabase.functions.invoke("create-invoice", {
      body: { interventionId: INTERVENTION_ID },
    });
    if (invoiceError || !invoice?.invoiceBase64) throw new Error(invoiceError?.message || "Invoice generation failed");

    const result = await sendClientEmail({
      supabase,
      interventionId: INTERVENTION_ID,
      to: RECIPIENT,
      subject: "Depan.Pro : Facture - Intervention DP-6NAAFY",
      html: buildInvoiceEmailHtml({
        trackingCode: "DP-6NAAFY",
        clientName: "Karidjatou Ouedraogo",
        address: "9 Place Saint Exupery, 95190 Goussainville",
        finalPrice: 350.30,
      }),
      attachments: [{ filename: invoice.invoiceFileName || "facture-DP-6NAAFY.pdf", content: invoice.invoiceBase64 }],
    });
    if (!result.sent) throw new Error(result.error || `Email skipped: ${result.skipped}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});