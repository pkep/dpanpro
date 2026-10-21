import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildTechnicianDispatchSms } from "../_shared/sms/templates.ts";

serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const frontend = Deno.env.get("FRONTEND_URL");
  if (!url || !key || !frontend) return Response.json({ error: "Missing configuration" }, { status: 500 });
  const db = createClient(url, key);
  if (req.headers.get("apikey") !== Deno.env.get("SUPABASE_ANON_KEY")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const { data: intervention, error } = await db.from("interventions")
    .select("id, category, city, address, postal_code, priority, description, questionnaire_answers, scheduled_at, b2b_partner_id")
    .eq("tracking_code", "DP-S6C24N").single();
  if (error || !intervention) return Response.json({ error: "Intervention not found" }, { status: 404 });
  let company: string | null = null;
  if (intervention.b2b_partner_id) {
    const { data } = await db.from("b2b_partners").select("company_name").eq("id", intervention.b2b_partner_id).single();
    company = data?.company_name ?? null;
  }
  const answers = Array.isArray(intervention.questionnaire_answers)
    ? intervention.questionnaire_answers.filter((a: unknown): a is string => typeof a === "string" && a.trim().length > 0) : [];
  const message = buildTechnicianDispatchSms({
    categoryLabel: "Plomberie", city: intervention.city, address: intervention.address,
    postalCode: intervention.postal_code, priority: intervention.priority,
    description: intervention.description, questionnaireAnswers: answers,
    b2bCompanyName: company, scheduledAt: intervention.scheduled_at ?? undefined,
    acceptanceUrl: `${frontend}/technician?acceptIntervention=${intervention.id}`,
  });
  const sent = await sendSMS("0627601237", message, "[RequestedDispatchCopy]");
  return Response.json({ sent, reference: "DP-S6C24N", recipients: 1 }, { status: sent ? 200 : 502 });
});