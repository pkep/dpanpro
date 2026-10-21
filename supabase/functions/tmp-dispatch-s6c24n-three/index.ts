import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { buildTechnicianDispatchSms } from "../_shared/sms/templates.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { confirmation } = await req.json();
  if (confirmation !== "dispatch-s6c24n-three-requested-only") return new Response("Forbidden", { status: 403 });
  const frontendUrl = Deno.env.get("FRONTEND_URL");
  if (!frontendUrl) return new Response("FRONTEND_URL missing", { status: 500 });
  const message = buildTechnicianDispatchSms({
    categoryLabel: "Plomberie", city: "Serris", address: "12 Rue des Scandinaves", postalCode: "77700",
    priority: "normal", description: "Remplacement ballon électrique",
    questionnaireAnswers: ["Remplacement ballon électrique"], b2bCompanyName: "HOSTOPIA",
    acceptanceUrl: `${frontendUrl}/technician?acceptIntervention=f81e21f2-ebff-44ae-a9fc-2ce311ad2b08`,
  });
  const results = [];
  for (const [name, phone] of [["Benjamin", "0685289976"], ["Haroun", "0656663095"], ["Adrien", "0611819161"]]) {
    results.push({ name, sent: await sendSMS(phone, message, "[RequestedDispatchSMS]") });
  }
  return Response.json({ results });
});