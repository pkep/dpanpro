import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { renderQuotePdf } from "../_shared/pdf/quote.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { interventionId } = await req.json();
    if (!interventionId || typeof interventionId !== "string") {
      return new Response(JSON.stringify({ error: "interventionId required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const result = await renderQuotePdf(interventionId);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("create-quote error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
