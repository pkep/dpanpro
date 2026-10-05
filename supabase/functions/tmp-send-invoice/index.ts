import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { buildInvoiceEmailHtml } from "../_shared/email-templates/invoice-email.ts";
Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const pdf = new Uint8Array(await (await fetch(`${url}/storage/v1/object/public/interventions/tmp/facture-DP-6NAAFY.pdf`)).arrayBuffer());
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Depan.Pro <contact@depan.pro>",
      to: ["kpaulimus@depan.pro"],
      subject: "Depan.Pro : Facture - Intervention DP-6NAAFY",
      html: buildInvoiceEmailHtml({ trackingCode: "DP-6NAAFY", clientName: "", address: "9 Place Saint Exupery, 95190 Goussainville", finalPrice: 350.29 }),
      attachments: [{ filename: "Facture-DP-6NAAFY.pdf", content: encodeBase64(pdf) }],
    }),
  });
  const body = await r.text();
  let removed = null;
  if (r.ok) removed = (await createClient(url, key).storage.from("interventions").remove(["tmp/facture-DP-6NAAFY.pdf"])).error;
  return new Response(JSON.stringify({ status: r.status, body, size: pdf.length, removed }));
});
