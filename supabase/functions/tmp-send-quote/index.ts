import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildQuoteEmailHtml } from "../_shared/email-templates/quote-email.ts";

serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const id = "632d8a68-e49e-4ac5-8fdc-e86928cb6d51";
    const r = await fetch(`${url}/functions/v1/create-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ interventionId: id }),
    });
    const { quoteBase64, quoteFileName } = await r.json();
    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const res = await resend.emails.send({
      from: `Depan.Pro <${from}>`,
      to: ["karlpaulimus@yahoo.com"],
      subject: "Depan.Pro : Votre devis d'intervention - DP-UUBL96",
      html: buildQuoteEmailHtml({ trackingCode: "DP-UUBL96", interventionId: id, address: "", postalCode: "", city: "", technicianName: "Technicien" }),
      attachments: [{ filename: quoteFileName, content: quoteBase64 }],
    });
    return new Response(JSON.stringify(res));
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
