import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildManualDispatchEmailHtml } from "../_shared/email-templates/manual-dispatch.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildManualDispatchSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyManualDispatchRequest {
  interventionId: string;
  technicianId: string;
  interventionDetails?: {
    title: string;
    address: string;
    city: string;
    postalCode: string;
    category: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, technicianId, interventionDetails }: NotifyManualDispatchRequest = await req.json();

    console.log(`[NotifyManualDispatch] Notifying technician ${technicianId} for intervention ${interventionId}`);

    const { data: techData, error: techError } = await supabase
      .from('users')
      .select('email, phone, first_name, last_name')
      .eq('id', technicianId)
      .single();

    if (techError || !techData) {
      console.error('[NotifyManualDispatch] Failed to fetch technician:', techError);
      return new Response(
        JSON.stringify({ error: "Technician not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let intervention = interventionDetails;
    if (!intervention) {
      const { data: intData, error: intError } = await supabase
        .from('interventions')
        .select('title, address, city, postal_code, category')
        .eq('id', interventionId)
        .single();

      if (intError || !intData) {
        console.error('[NotifyManualDispatch] Failed to fetch intervention:', intError);
        return new Response(
          JSON.stringify({ error: "Intervention not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      intervention = {
        title: intData.title,
        address: intData.address,
        city: intData.city,
        postalCode: intData.postal_code,
        category: intData.category,
      };
    }

    const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
    const results = { sms: false, email: false, push: false };

    // 1. Send SMS via shared Twilio module
    if (techData.phone) {
      const smsMessage = buildManualDispatchSms({
        categoryLabel,
        city: intervention.city,
        address: intervention.address,
      });
      results.sms = await sendSMS(techData.phone, smsMessage, "[NotifyManualDispatch]");
    }

    // 2. Send Email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (resendApiKey) {
      try {
        const { Resend } = await import("https://esm.sh/resend@2.0.0");
        const resend = new Resend(resendApiKey as string);

        const emailHtml = buildManualDispatchEmailHtml({
          firstName: techData.first_name,
          categoryLabel,
          address: intervention.address,
          postalCode: intervention.postalCode,
          city: intervention.city,
        });

        await resend.emails.send({
          from: `Depan.Pro <${resendFromEmail}>`,
          to: [techData.email],
          subject: `Depan.Pro : Mission assignée - ${categoryLabel} à ${intervention.city}`,
          html: emailHtml,
        });

        console.log('[NotifyManualDispatch] Email sent successfully');
        results.email = true;
      } catch (emailError) {
        console.error('[NotifyManualDispatch] Email error:', emailError);
      }
    }

    // 3. Send Push via FCM
    const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");
    if (firebaseServerKey) {
      try {
        const { data: pushSubs } = await supabase
          .from('push_subscriptions')
          .select('fcm_token')
          .eq('user_id', technicianId)
          .eq('is_active', true);

        if (pushSubs && pushSubs.length > 0) {
          for (const sub of pushSubs) {
            const pushPayload = {
              to: sub.fcm_token,
              notification: {
                title: '📋 Mission Assignée',
                body: `${categoryLabel} à ${intervention.city} - Assignée par le manager`,
                icon: '/icons/icon-192x192.png',
              },
              data: {
                type: 'manual_dispatch',
                interventionId: interventionId,
              },
            };

            const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Authorization': `key=${firebaseServerKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(pushPayload),
            });

            if (fcmResponse.ok) {
              results.push = true;
            }
          }
          console.log('[NotifyManualDispatch] Push sent successfully');
        }
      } catch (pushError) {
        console.error('[NotifyManualDispatch] Push error:', pushError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[NotifyManualDispatch] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
