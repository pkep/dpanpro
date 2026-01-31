import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface NotifyStatusChangeRequest {
  interventionId: string;
  newStatus: string;
  oldStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  assigned: "Assigné",
  on_route: "En route",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_MESSAGES: Record<string, string> = {
  assigned: "Un technicien a été assigné à votre intervention",
  on_route: "Le technicien est en route vers votre adresse",
  in_progress: "L'intervention est en cours",
  completed: "L'intervention est terminée",
  cancelled: "L'intervention a été annulée",
};

const STATUS_EMOJI: Record<string, string> = {
  assigned: "👨‍🔧",
  on_route: "🚗",
  in_progress: "🔧",
  completed: "✅",
  cancelled: "❌",
};

// Format French phone number to international format
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

// Send SMS via Twilio
async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Twilio credentials not configured");
    return false;
  }

  const formattedTo = formatPhoneNumber(to);
  console.log("Sending SMS to:", formattedTo);

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

    const result = await response.json();
    
    if (response.ok) {
      console.log("SMS sent successfully:", result.sid);
      return true;
    } else {
      console.error("Twilio error:", result);
      return false;
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
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
  data?: Record<string, string>
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
  
  // Try to get tokens by client_id first
  if (clientId) {
    const { data: tokensByUserId } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', clientId)
      .eq('is_active', true);
    
    if (tokensByUserId) {
      tokens.push(...tokensByUserId.map(t => t.fcm_token));
    }
  }
  
  // Also try by email
  if (clientEmail) {
    const { data: tokensByEmail } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('email', clientEmail)
      .eq('is_active', true);
    
    if (tokensByEmail) {
      tokens.push(...tokensByEmail.map(t => t.fcm_token));
    }
  }
  
  // Remove duplicates
  return [...new Set(tokens)];
}

function buildEmailHtml(
  intervention: { title: string; tracking_code: string | null; address: string; city: string; id: string },
  newStatus: string,
  statusMessage: string,
  baseUrl: string
): string {
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const emoji = STATUS_EMOJI[newStatus] || "📋";
  const trackingUrl = intervention.tracking_code 
    ? `${baseUrl}/track/${intervention.tracking_code}`
    : `${baseUrl}/intervention/${intervention.tracking_code}`;

  // Status-specific colors
  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    assigned: { bg: "#e0f2fe", border: "#0ea5e9", text: "#0369a1" },
    on_route: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
    in_progress: { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
    completed: { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
    cancelled: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
  };

  const colors = statusColors[newStatus] || statusColors.assigned;

  // Rating section for completed interventions
  const ratingSection = newStatus === 'completed' ? `
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 18px;">⭐ Votre avis compte !</h3>
          <p style="margin: 0 0 16px 0; color: #78350f; font-size: 14px;">
            Prenez un instant pour noter votre technicien et partager votre expérience.
          </p>
          <a href="${baseUrl}/intervention/${intervention.id}#rating" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px;">
            ⭐ Noter l'intervention
          </a>
        </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Depan.Pro : Mise à jour de votre intervention</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 50px; margin-bottom: 15px;" />
          <h1 style="color: #1a1a2e; margin: 0; font-size: 24px;">
            ${emoji} Mise à jour de votre intervention
          </h1>
        </div>
        
        <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 16px; margin: 24px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 18px; color: ${colors.text}; font-weight: 600;">
            Nouveau statut : ${statusLabel}
          </p>
        </div>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">${statusMessage}</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; color: #1a1a2e; font-size: 16px;">📋 Détails de l'intervention</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 100px;">Référence</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${intervention.tracking_code || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Service</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${intervention.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Adresse</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: 500;">${intervention.address}, ${intervention.city}</td>
            </tr>
          </table>
        </div>

        ${ratingSection}
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${trackingUrl}" style="background: linear-gradient(135deg, #1a1a2e, #2d2d4a); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            🔍 Suivre mon intervention
          </a>
        </div>
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          Cet email a été envoyé par Depan.Pro.<br>
          En cas de question, contactez notre service client.
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId, newStatus, oldStatus }: NotifyStatusChangeRequest = await req.json();

    console.log(`Status change notification: ${oldStatus || 'unknown'} -> ${newStatus} for intervention ${interventionId}`);

    // Only notify for specific statuses
    const notifiableStatuses = ['assigned', 'on_route', 'in_progress', 'completed', 'cancelled'];
    
    if (!notifiableStatuses.includes(newStatus)) {
      console.log(`Status '${newStatus}' is not notifiable, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: `No notification for status: ${newStatus}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get intervention details
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
      return new Response(
        JSON.stringify({ success: true, message: "No client contact info" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusMessage = STATUS_MESSAGES[newStatus] || `Le statut de votre intervention a changé: ${STATUS_LABELS[newStatus] || newStatus}`;
    const baseUrl = Deno.env.get("SITE_URL") || "https://dpanpro.lovable.app";
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
      const emailHtml = buildEmailHtml(intervention, newStatus, statusMessage, baseUrl);
      const emailResult = await sendEmail(clientEmail, subject, emailHtml);
      results.email = emailResult.ok;
      results.email_status = emailResult.status;
      results.email_error = emailResult.error;
    }

    // Send SMS if available
    if (clientPhone) {
      const trackingUrl = intervention.tracking_code 
        ? `${baseUrl}/track/${intervention.tracking_code}`
        : baseUrl;
      
      // Add rating prompt for completed interventions
      const ratingPrompt = newStatus === 'completed' 
        ? ` Notez votre experience: ${baseUrl}/intervention/${intervention.id}#rating`
        : '';
      
      const smsMessage = `${emoji} Depan.Pro: ${statusMessage}. Ref: ${intervention.tracking_code || "N/A"}.${ratingPrompt} Suivez: ${trackingUrl}`;
      results.sms = await sendSMS(clientPhone, smsMessage);
    }

    // Send push notification if tokens available
    try {
      const fcmTokens = await getClientFcmTokens(clientId, clientEmail);
      
      if (fcmTokens.length > 0) {
        console.log(`Found ${fcmTokens.length} FCM tokens for client`);
        
        const pushTitle = `${emoji} ${STATUS_LABELS[newStatus]}`;
        const pushBody = statusMessage;
        const pushData = {
          type: 'status_change',
          interventionId,
          status: newStatus,
          trackingCode: intervention.tracking_code || '',
          url: intervention.tracking_code 
            ? `/track/${intervention.tracking_code}` 
            : `/intervention/${interventionId}`,
        };

        // Send to all tokens
        const pushResults = await Promise.all(
          fcmTokens.map(token => sendPushNotification(token, pushTitle, pushBody, pushData))
        );
        
        results.push = pushResults.some(r => r === true);
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

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-status-change:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
