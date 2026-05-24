import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "intervention-photos";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { interventionId } = await req.json();
    if (!interventionId || typeof interventionId !== "string") {
      return new Response(JSON.stringify({ error: "interventionId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Generate quote PDF via create-quote
    const { data: quoteData, error: quoteErr } = await supabase.functions.invoke("create-quote", {
      body: { interventionId },
    });
    if (quoteErr) throw new Error(`create-quote failed: ${quoteErr.message}`);
    if (!quoteData?.success || !quoteData?.quoteBase64) {
      throw new Error("create-quote did not return a PDF");
    }

    const { quoteBase64, quoteFileName, quoteNumber } = quoteData;
    const fileBytes = base64ToUint8Array(quoteBase64);
    const path = `${interventionId}/documents/${quoteFileName}`;

    // 2. Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return new Response(
      JSON.stringify({
        success: true,
        quoteNumber,
        quoteFileName,
        path,
        bucket: BUCKET,
        publicUrl: publicUrlData.publicUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("upload-quote-pdf error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
