import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildTechnicianDispatchSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyTechnicianRequest {
  interventionId: string;
  technicianIds: string[];
  interventionDetails?: {
    title: string;
    address: string;
    city: string;
    postalCode: string;
    category: string;
    priority: string;
    scheduledAt?: string;
  };
}

interface TechnicianInfo {
  id: string;
  phone: string | null;
  firstName: string;
  lastName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: "Serrurerie",
  plumbing: "Plomberie",
  electricity: "Électricité",
  glazing: "Vitrerie",
  heating: "Chauffage",
  aircon: "Climatisation",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const frontendUrl = Deno.env.get("FRONTEND_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, technicianIds, interventionDetails }: NotifyTechnicianRequest = await req.json();

    console.log(`[NotifyTechnicianDispatch] Starting notification for intervention ${interventionId}`);
    console.log(`[NotifyTechnicianDispatch] Technicians to notify:`, technicianIds);

    if (!interventionId || !technicianIds || technicianIds.length === 0) {
      return new Response(JSON.stringify({ error: "Missing interventionId or technicianIds" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let intervention = interventionDetails;
    if (!intervention) {
      const { data: intData, error: intError } = await supabase
        .from("interventions")
        .select("title, address, city, postal_code, category, priority, scheduled_at")
        .eq("id", interventionId)
        .single();

      if (intError || !intData) {
        console.error("[NotifyTechnicianDispatch] Failed to fetch intervention:", intError);
        return new Response(JSON.stringify({ error: "Intervention not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      intervention = {
        title: intData.title,
        address: intData.address,
        city: intData.city,
        postalCode: intData.postal_code,
        category: intData.category,
        priority: intData.priority,
        scheduledAt: intData.scheduled_at,
      };
    }

    // Fetch questionnaire answers to include in the SMS
    let questionnaireAnswers: string[] = [];
    try {
      const { data: qaData, error: qaError } = await supabase
        .from("interventions")
        .select("questionnaire_answers")
        .eq("id", interventionId)
        .single();

      if (qaError) {
        console.error("[NotifyTechnicianDispatch] Failed to fetch questionnaire answers:", qaError);
      } else if (Array.isArray(qaData?.questionnaire_answers)) {
        questionnaireAnswers = qaData.questionnaire_answers.filter(
          (a: unknown): a is string => typeof a === "string" && a.trim().length > 0,
        );
      }
    } catch (e) {
      console.error("[NotifyTechnicianDispatch] Error fetching questionnaire answers:", e);
    }
    console.log(`[NotifyTechnicianDispatch] Questionnaire answers:`, questionnaireAnswers);

    const { data: technicians, error: techError } = await supabase
      .from("users")
      .select("id, phone, first_name, last_name")
      .in("id", technicianIds);

    if (techError) {
      console.error("[NotifyTechnicianDispatch] Failed to fetch technicians:", techError);
      return new Response(JSON.stringify({ error: "Failed to fetch technician details" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const technicianInfos: TechnicianInfo[] = (technicians || []).map((t) => ({
      id: t.id,
      phone: t.phone,
      firstName: t.first_name,
      lastName: t.last_name,
    }));

    console.log(`[NotifyTechnicianDispatch] Found ${technicianInfos.length} technicians with contact info`);

    const results = {
      sms: { sent: 0, failed: 0, errors: [] as string[] },
      push: { sent: 0, failed: 0, errors: [] as string[] },
    };

    const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
    const isUrgent = intervention.priority === "urgent";
    const acceptanceUrl = frontendUrl + "/technician?acceptIntervention=" + interventionId;

    for (const tech of technicianInfos) {
      console.log(`[NotifyTechnicianDispatch] Processing technician ${tech.id} (${tech.firstName} ${tech.lastName})`);

      // 1. Send SMS via shared Twilio module
      if (tech.phone) {
        try {
          const smsMessage = buildTechnicianDispatchSms({
            categoryLabel,
            city: intervention.city,
            address: intervention.address,
            postalCode: intervention.postalCode,
            isUrgent,
            acceptanceUrl,
            questionnaireAnswers,
            scheduledAt: intervention.scheduledAt,
          });
          const sent = await sendSMS(tech.phone, smsMessage, "[NotifyTechnicianDispatch]");
          if (sent) {
            results.sms.sent++;
          } else {
            results.sms.failed++;
          }
        } catch (smsError: unknown) {
          const errorMessage = smsError instanceof Error ? smsError.message : String(smsError);
          console.error(`[NotifyTechnicianDispatch] SMS error for ${tech.id}:`, smsError);
          results.sms.failed++;
          results.sms.errors.push(`${tech.id}: ${errorMessage}`);
        }
      }

      // 2. Send Push Notification via FCM
      try {
        const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

        if (firebaseServerKey) {
          const { data: pushSubs, error: pushError } = await supabase
            .from("push_subscriptions")
            .select("fcm_token")
            .eq("user_id", tech.id)
            .eq("is_active", true);

          if (pushError) {
            console.error(`[NotifyTechnicianDispatch] Failed to fetch push tokens for ${tech.id}:`, pushError);
          } else if (pushSubs && pushSubs.length > 0) {
            for (const sub of pushSubs) {
              const pushPayload = {
                to: sub.fcm_token,
                notification: {
                  title: isUrgent ? "🚨 Mission Urgente !" : "📋 Nouvelle Mission",
                  body: `${categoryLabel} à ${intervention.city} - ${intervention.address}`,
                  icon: "/icons/icon-192x192.png",
                  badge: "/icons/icon-72x72.png",
                  click_action: Deno.env.get("FRONTEND_URL") || "https://dpanpro.lovable.app/technician",
                },
                data: {
                  type: "dispatch_notification",
                  interventionId: interventionId,
                  category: intervention.category,
                  priority: intervention.priority,
                },
              };

              const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
                method: "POST",
                headers: {
                  Authorization: `key=${firebaseServerKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(pushPayload),
              });

              if (fcmResponse.ok) {
                const fcmData = await fcmResponse.json();
                if (fcmData.success === 1) {
                  console.log(`[NotifyTechnicianDispatch] Push sent to ${tech.id}`);
                  results.push.sent++;
                } else {
                  console.error(`[NotifyTechnicianDispatch] Push failed for ${tech.id}:`, fcmData);
                  results.push.failed++;
                  results.push.errors.push(`${tech.id}: FCM failure`);
                }
              } else {
                const errorText = await fcmResponse.text();
                console.error(`[NotifyTechnicianDispatch] Push HTTP error for ${tech.id}:`, errorText);
                results.push.failed++;
                results.push.errors.push(`${tech.id}: ${errorText}`);
              }
            }
          } else {
            console.log(`[NotifyTechnicianDispatch] No push tokens for technician ${tech.id}`);
          }
        } else {
          console.log("[NotifyTechnicianDispatch] Firebase not configured, skipping push");
        }
      } catch (pushError: unknown) {
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
        console.error(`[NotifyTechnicianDispatch] Push error for ${tech.id}:`, pushError);
        results.push.failed++;
        results.push.errors.push(`${tech.id}: ${errorMessage}`);
      }
    }

    console.log("[NotifyTechnicianDispatch] Notification results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        techniciansNotified: technicianInfos.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[NotifyTechnicianDispatch] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
