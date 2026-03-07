import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildPaymentRequiredEmailHtml } from "../_shared/email-templates/payment-required.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface NotifyPaymentRequiredRequest {
  interventionId: string;
  reason?: string;
}

type TwilioMessageResult = {
  sid?: string;
  status?: string;
  error_code?: string | number | null;
  error_message?: string | null;
};

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+33" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+33" + cleaned;
  }
  return cleaned;
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Twilio credentials not configured");
    return false;
  }

  const formattedTo = formatPhoneNumber(to);
  console.log("[NOTIFY-PAYMENT] Sending SMS to:", formattedTo);

  try {
    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const result: TwilioMessageResult = await response.json();

    if (response.ok) {
      console.log("[NOTIFY-PAYMENT] SMS sent successfully:", {
        sid: result.sid,
        status: result.status,
        error_code: result.error_code,
        error_message: result.error_message,
      });

      if (result.sid) {
        try {
          const credentials = btoa(`${accountSid}:${authToken}`);
          const statusRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${result.sid}.json`,
            {
              method: "GET",
              headers: {
                "Authorization": `Basic ${credentials}`,
              },
            }
          );

          const statusBody: TwilioMessageResult = await statusRes.json();
          console.log("[NOTIFY-PAYMENT] Twilio message status:", {
            sid: statusBody.sid,
            status: statusBody.status,
            error_code: statusBody.error_code,
            error_message: statusBody.error_message,
          });
        } catch (statusErr) {
          console.error("[NOTIFY-PAYMENT] Failed to fetch Twilio message status:", statusErr);
        }
      }
      return true;
    } else {
      console.error("[NOTIFY-PAYMENT] Twilio error:", result);
      return false;
    }
  } catch (error) {
    console.error("[NOTIFY-PAYMENT] Error sending SMS:", error);
    return false;
  }
}

async function getUserContact(userId: string | null): Promise<{ phone: string | null; email: string | null }> {
  if (!userId) return { phone: null, email: null };

  try {
    const { data, error } = await supabase
      .from("users")
      .select("phone, email")
      .eq("id", userId)
      .maybeSingle();

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

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
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
        "Authorization": `Bearer ${resendApiKey}`,
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

async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  url: string
): Promise<boolean> {
  const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");

  if (!firebaseServerKey) {
    console.log("[NOTIFY-PAYMENT] FIREBASE_SERVER_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${firebaseServerKey}`,
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "";
    const frontendUrl = `https://${projectRef.slice(0, 8)}-preview--${projectRef}.lovable.app`;
    const trackingUrl = `${frontendUrl}/track/${trackingCode}`;

    console.log("[NOTIFY-PAYMENT] Tracking URL:", trackingUrl);

    const smsMessage = `Depan.Pro: autorisation de paiement requise.\nOuvrez: ${trackingUrl}\nCode: ${trackingCode}`;

    const emailSubject = "Depan.Pro : Autorisation de paiement requise";
    const emailHtml = buildPaymentRequiredEmailHtml({ trackingCode, trackingUrl });

    const pushTitle = "⚠️ Autorisation de paiement requise";
    const pushBody = "Votre technicien attend votre autorisation carte pour finaliser l'intervention.";

    const results = {
      sms: false,
      email: false,
      push: false,
      pushTokensCount: 0,
    };

    if (clientPhone) {
      results.sms = await sendSMS(clientPhone, smsMessage);
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

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[NOTIFY-PAYMENT] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
