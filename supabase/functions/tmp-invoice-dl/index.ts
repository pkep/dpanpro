import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(`${url}/functions/v1/create-invoice`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ interventionId: "595964fb-2dbb-4f5c-b7a7-2ac822a7a3fa" }) });
  const { invoiceBase64 } = await r.json();
  const bytes = Uint8Array.from(atob(invoiceBase64), c => c.charCodeAt(0));
  const sb = createClient(url, key);
  const { error } = await sb.storage.from("interventions").upload("tmp/facture-DP-6NAAFY.pdf", bytes, { contentType: "application/pdf", upsert: true });
  return new Response(JSON.stringify({ error, size: bytes.length }));
});
