const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
Deno.serve(async () => {
  const r = await fetch(`${URL_}/functions/v1/create-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ interventionId: "632d8a68-e49e-4ac5-8fdc-e86928cb6d51" }),
  });
  const { quoteBase64, quoteFileName } = await r.json();
  const s = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}` },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Depan.Pro <contact@depan.pro>",
      to: ["karlpaulimus@yahoo.com"],
      subject: "Depan.Pro: Devis corrigé DP-UUBL96",
      html: "<p>Veuillez trouver ci-joint le devis corrigé de l'intervention DP-UUBL96.</p>",
      attachments: [{ filename: quoteFileName || "devis-DP-UUBL96.pdf", content: quoteBase64 }],
    }),
  });
  return new Response(JSON.stringify({ status: s.status, body: await s.text() }));
});
