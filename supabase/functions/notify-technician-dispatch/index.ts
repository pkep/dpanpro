import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildTechnicianDispatchEmailHtml } from "../_shared/email-templates/technician-dispatch.ts";
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
  };
}

interface TechnicianInfo {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '🚨 URGENT',
  normal: 'Normal',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, technicianIds, interventionDetails }: NotifyTechnicianRequest = await req.json();

    console.log(`[NotifyTechnicianDispatch] Starting notification for intervention ${interventionId}`);
    console.log(`[NotifyTechnicianDispatch] Technicians to notify:`, technicianIds);

    if (!interventionId || !technicianIds || technicianIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing interventionId or technicianIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let intervention = interventionDetails;
    if (!intervention) {
      const { data: intData, error: intError } = await supabase
        .from('interventions')
        .select('title, address, city, postal_code, category, priority')
        .eq('id', interventionId)
        .single();

      if (intError || !intData) {
        console.error('[NotifyTechnicianDispatch] Failed to fetch intervention:', intError);
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
        priority: intData.priority,
      };
    }

    const { data: technicians, error: techError } = await supabase
      .from('users')
      .select('id, email, phone, first_name, last_name')
      .in('id', technicianIds);

    if (techError) {
      console.error('[NotifyTechnicianDispatch] Failed to fetch technicians:', techError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch technician details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const technicianInfos: TechnicianInfo[] = (technicians || []).map(t => ({
      id: t.id,
      email: t.email,
      phone: t.phone,
      firstName: t.first_name,
      lastName: t.last_name,
    }));

    console.log(`[NotifyTechnicianDispatch] Found ${technicianInfos.length} technicians with contact info`);

    const results = {
      sms: { sent: 0, failed: 0, errors: [] as string[] },
      email: { sent: 0, failed: 0, errors: [] as string[] },
      push: { sent: 0, failed: 0, errors: [] as string[] },
    };

    const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
    const priorityLabel = PRIORITY_LABELS[intervention.priority] || intervention.priority;
    const isUrgent = intervention.priority === 'urgent';

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

      // 2. Send Email via Resend
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

        if (resendApiKey) {
          const emailSubject = isUrgent
            ? `Depan.Pro : 🚨 URGENT - Nouvelle mission ${categoryLabel} à ${intervention.city}`
            : `Depan.Pro : Nouvelle mission ${categoryLabel} à ${intervention.city}`;

          const emailHtml = buildTechnicianDispatchEmailHtml({
            firstName: tech.firstName,
            categoryLabel,
            address: intervention.address,
            postalCode: intervention.postalCode,
            city: intervention.city,
            priorityLabel,
            isUrgent,
          });

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `Depan.Pro <${resendFromEmail}>`,
              to: [tech.email],
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            console.log(`[NotifyTechnicianDispatch] Email sent to ${tech.email}, ID: ${emailData.id}`);
            results.email.sent++;
          } else {
            const errorText = await emailResponse.text();
            console.error(`[NotifyTechnicianDispatch] Email failed for ${tech.email}:`, errorText);
            results.email.failed++;
            results.email.errors.push(`${tech.id}: ${errorText}`);
          }
        } else {
          console.log('[NotifyTechnicianDispatch] Resend not configured, skipping email');
        }
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`[NotifyTechnicianDispatch] Email error for ${tech.id}:`, emailError);
        results.email.failed++;
        results.email.errors.push(`${tech.id}: ${errorMessage}`);
      }

      // 3. Send Push Notification via FCM
      try {
        const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

        if (firebaseServerKey) {
          const { data: pushSubs, error: pushError } = await supabase
            .from('push_subscriptions')
            .select('fcm_token')
            .eq('user_id', tech.id)
            .eq('is_active', true);

          if (pushError) {
            console.error(`[NotifyTechnicianDispatch] Failed to fetch push tokens for ${tech.id}:`, pushError);
          } else if (pushSubs && pushSubs.length > 0) {
            for (const sub of pushSubs) {
              const pushPayload = {
                to: sub.fcm_token,
                notification: {
                  title: isUrgent ? '🚨 Mission Urgente !' : '📋 Nouvelle Mission',
                  body: `${categoryLabel} à ${intervention.city} - ${intervention.address}`,
                  icon: '/icons/icon-192x192.png',
                  badge: '/icons/icon-72x72.png',
                  click_action: Deno.env.get("FRONTEND_URL") || 'https://dpanpro.lovable.app/technician',
                },
                data: {
                  type: 'dispatch_notification',
                  interventionId: interventionId,
                  category: intervention.category,
                  priority: intervention.priority,
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
          console.log('[NotifyTechnicianDispatch] Firebase not configured, skipping push');
        }
      } catch (pushError: unknown) {
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
        console.error(`[NotifyTechnicianDispatch] Push error for ${tech.id}:`, pushError);
        results.push.failed++;
        results.push.errors.push(`${tech.id}: ${errorMessage}`);
      }
    }

    console.log('[NotifyTechnicianDispatch] Notification results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        techniciansNotified: technicianInfos.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[NotifyTechnicianDispatch] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
