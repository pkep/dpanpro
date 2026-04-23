import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildStatusChangeEmailHtml, STATUS_LABELS, STATUS_EMOJI } from "../_shared/email-templates/status-change.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildStatusChangeSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

interface NotifyStatusChangeRequest {
  interventionId: string;
  newStatus: string;
  oldStatus?: string;
}

const STATUS_MESSAGES: Record<string, string> = {
  assigned: "Un technicien a été assigné à votre intervention",
  on_route: "Le technicien est en route vers votre adresse",
  arrived: "Le technicien est arrivé devant chez vous",
  in_progress: "L'intervention est en cours",
  completed: "L'intervention est terminée",
  cancelled: "L'intervention a été annulée",
};

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    console.log("Sending email to:", to, "from:", fromEmail);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Depan.Pro <${fromEmail}>`,
        to: [to],
        subject,
        html: htmlContent,
      }),
    });

    const status = response.status;
    const bodyText = await response.text();

    if (response.ok) {
      console.log("Email sent successfully to:", to, "status:", status);
      return { ok: true, status };
    }

    console.error("Resend error (status:", status, "):", bodyText);
    return {
      ok: false,
      status,
      error: bodyText || `Resend request failed with status ${status}`,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send push notification via Firebase Cloud Messaging
async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

  if (!firebaseServerKey) {
    console.log("FIREBASE_SERVER_KEY not configured - skipping push notification");
    return false;
  }

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${firebaseServerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: {
          title,
          body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          click_action: data?.url || "/",
        },
        data: {
          ...data,
          title,
          body,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success === 1) {
        console.log("Push notification sent successfully");
        return true;
      } else {
        console.error("FCM error:", result);
        return false;
      }
    } else {
      const errorBody = await response.text();
      console.error("FCM request error:", errorBody);
      return false;
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

// Get client FCM tokens from database
async function getClientFcmTokens(clientId: string | null, clientEmail: string | null): Promise<string[]> {
  const tokens: string[] = [];

  if (clientId) {
    const { data: tokensByUserId } = await supabase
      .from("push_subscriptions")
      .select("fcm_token")
      .eq("user_id", clientId)
      .eq("is_active", true);

    if (tokensByUserId) {
      tokens.push(...tokensByUserId.map((t) => t.fcm_token));
    }
  }

  if (clientEmail) {
    const { data: tokensByEmail } = await supabase
      .from("push_subscriptions")
      .select("fcm_token")
      .eq("email", clientEmail)
      .eq("is_active", true);

    if (tokensByEmail) {
      tokens.push(...tokensByEmail.map((t) => t.fcm_token));
    }
  }

  return [...new Set(tokens)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId, newStatus, oldStatus }: NotifyStatusChangeRequest = await req.json();

    console.log(
      `Status change notification: ${oldStatus || "unknown"} -> ${newStatus} for intervention ${interventionId}`,
    );

    const notifiableStatuses = ["assigned", "on_route", "arrived", "in_progress", "completed", "cancelled"];

    if (!notifiableStatuses.includes(newStatus)) {
      console.log(`Status '${newStatus}' is not notifiable, skipping`);
      return new Response(JSON.stringify({ success: true, message: `No notification for status: ${newStatus}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (intError || !intervention) {
      console.error("Intervention not found:", intError);
      throw new Error("Intervention not found");
    }

    const clientEmail = intervention.client_email;
    const clientPhone = intervention.client_phone;
    const clientId = intervention.client_id;

    if (!clientEmail && !clientPhone) {
      console.log("No client contact info available");
      return new Response(JSON.stringify({ success: true, message: "No client contact info" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusMessage =
      STATUS_MESSAGES[newStatus] ||
      `Le statut de votre intervention a changé: ${STATUS_LABELS[newStatus] || newStatus}`;
    const baseUrl = Deno.env.get("FRONTEND_URL") || Deno.env.get("SITE_URL") || "https://dpanpro.lovable.app";
    const emoji = STATUS_EMOJI[newStatus] || "📋";

    const results: {
      email?: boolean;
      email_status?: number;
      email_error?: string;
      sms?: boolean;
      push?: boolean;
      push_reason?: string;
    } = {};

    // Send email if available
    if (clientEmail) {
      const subject = `Depan.Pro : ${intervention.title} - ${STATUS_LABELS[newStatus] || newStatus}`;
      const emailHtml = buildStatusChangeEmailHtml({ intervention, newStatus, statusMessage, baseUrl });
      const emailResult = await sendEmail(clientEmail, subject, emailHtml);
      results.email = emailResult.ok;
      results.email_status = emailResult.status;
      results.email_error = emailResult.error;
    }

    // Send SMS if available
    if (clientPhone) {
      const trackingUrl = intervention.tracking_code
        ? `${baseUrl}/mon-suivi?code=${intervention.tracking_code}`
        : baseUrl;

      const smsMessage = buildStatusChangeSms({
        emoji,
        statusMessage,
        trackingCode: intervention.tracking_code,
        trackingUrl,
        interventionId: intervention.id,
        baseUrl,
        isCompleted: newStatus === "completed",
      });
      results.sms = await sendSMS(clientPhone, smsMessage, "[StatusChange]");
    }

    // Send push notification if tokens available
    try {
      const fcmTokens = await getClientFcmTokens(clientId, clientEmail);

      if (fcmTokens.length > 0) {
        console.log(`Found ${fcmTokens.length} FCM tokens for client`);

        const pushTitle = `${emoji} ${STATUS_LABELS[newStatus]}`;
        const pushBody = statusMessage;
        const pushData = {
          type: "status_change",
          interventionId,
          status: newStatus,
          trackingCode: intervention.tracking_code || "",
          url: intervention.tracking_code
            ? `/mon-suivi?code=${intervention.tracking_code}`
            : `/intervention/${interventionId}`,
        };

        const pushResults = await Promise.all(
          fcmTokens.map((token) => sendPushNotification(token, pushTitle, pushBody, pushData)),
        );

        results.push = pushResults.some((r) => r === true);
        results.push_reason = results.push ? undefined : "FCM send failed";
      } else {
        console.log("No FCM tokens found for client");
        results.push = false;
        results.push_reason = "No tokens registered";
      }
    } catch (pushError) {
      console.error("Error sending push notifications:", pushError);
      results.push = false;
      results.push_reason = pushError instanceof Error ? pushError.message : "Unknown push error";
    }

    console.log("Notification results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-status-change:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
