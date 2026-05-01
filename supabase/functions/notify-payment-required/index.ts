import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildPaymentRequiredEmailHtml } from "../_shared/email-templates/payment-required.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildPaymentRequiredSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

interface NotifyPaymentRequiredRequest {
  interventionId: string;
  reason?: string;
}

async function getUserContact(userId: string | null): Promise<{ phone: string | null; email: string | null }> {
  if (!userId) return { phone: null, email: null };

  try {
    const { data, error } = await supabase.from("users").select("phone, email").eq("id", userId).maybeSingle();

    if (error) {
      console.error("[NOTIFY-PAYMENT] Failed to fetch user contact:", error);
      return { phone: null, email: null };
    }

    return {
      phone: data?.phone ?? null,
      email: (data as unknown as { email?: string | null } | null)?.email ?? null,
    };
  } catch (e) {
    console.error("[NOTIFY-PAYMENT] Failed to fetch user contact (exception):", e);
    return { phone: null, email: null };
  }
}

async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.log("[NOTIFY-PAYMENT] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    console.log("[NOTIFY-PAYMENT] Sending email to:", to, "from:", fromEmail);

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

    if (response.ok) {
      console.log("[NOTIFY-PAYMENT] Email sent successfully to:", to);
      return true;
    }

    const errorBody = await response.text();
    console.error("[NOTIFY-PAYMENT] Resend error:", errorBody);
    return false;
  } catch (error) {
    console.error("[NOTIFY-PAYMENT] Error sending email:", error);
    return false;
  }
}

async function sendPushNotification(fcmToken: string, title: string, body: string, url: string): Promise<boolean> {
  const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

  if (!firebaseServerKey) {
    console.log("[NOTIFY-PAYMENT] FIREBASE_SERVER_KEY not configured");
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
          click_action: url,
        },
        data: { title, body, url },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success === 1) {
        console.log("[NOTIFY-PAYMENT] Push notification sent successfully");
        return true;
      }
      console.error("[NOTIFY-PAYMENT] FCM error:", result);
    } else {
      const errorBody = await response.text();
      console.error("[NOTIFY-PAYMENT] FCM request error:", errorBody);
    }
  } catch (error) {
    console.error("[NOTIFY-PAYMENT] Error sending push notification:", error);
  }
  return false;
}

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
    const { interventionId, reason }: NotifyPaymentRequiredRequest = await req.json();

    console.log("[NOTIFY-PAYMENT] Request received for intervention:", interventionId, "reason:", reason);

    if (!interventionId) {
      throw new Error("Missing interventionId");
    }

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      throw new Error("Intervention not found");
    }

    const trackingCode = intervention.tracking_code;
    let clientEmail = intervention.client_email as string | null;
    let clientPhone = intervention.client_phone as string | null;
    const clientId = intervention.client_id;

    if ((!clientPhone || !clientEmail) && clientId) {
      const fallback = await getUserContact(clientId);
      clientPhone = clientPhone || fallback.phone;
      clientEmail = clientEmail || fallback.email;
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://dpanpro.lovable.app";
    const trackingUrl = `${frontendUrl}/mon-suivi?code=${trackingCode}`;
    const paymentUrl = `${frontendUrl}/authorize-payment/${interventionId}`;

    console.log("[NOTIFY-PAYMENT] Tracking URL:", trackingUrl);

    console.log("[NOTIFY-PAYMENT] Payment URL:", paymentUrl);

    const smsMessage = buildPaymentRequiredSms({ trackingCode, trackingUrl, paymentUrl });

    const emailSubject = "Depan.Pro : Autorisation de paiement requise";
    const emailHtml = buildPaymentRequiredEmailHtml({ trackingCode, trackingUrl, paymentUrl });

    const pushTitle = "⚠️ Autorisation de paiement requise";
    const pushBody = "Votre technicien attend votre autorisation carte pour finaliser l'intervention.";

    const results = {
      sms: false,
      email: false,
      push: false,
      pushTokensCount: 0,
    };

    if (clientPhone) {
      results.sms = await sendSMS(clientPhone, smsMessage, "[NOTIFY-PAYMENT]");
    }

    if (clientEmail) {
      results.email = await sendEmail(clientEmail, emailSubject, emailHtml);
    }

    const fcmTokens = await getClientFcmTokens(clientId, clientEmail);
    results.pushTokensCount = fcmTokens.length;

    if (fcmTokens.length > 0) {
      for (const token of fcmTokens) {
        const sent = await sendPushNotification(token, pushTitle, pushBody, trackingUrl);
        if (sent) results.push = true;
      }
    }

    console.log("[NOTIFY-PAYMENT] Notification results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[NOTIFY-PAYMENT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
