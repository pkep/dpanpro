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
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dépan'Express <notifications@resend.dev>",
        to: [to],
        subject,
        html: htmlContent,
      }),
    });

    if (response.ok) {
      console.log("Email sent successfully to:", to);
      return true;
    } else {
      const errorBody = await response.text();
      console.error("Resend error:", errorBody);
      return false;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

function buildEmailHtml(
  intervention: { title: string; tracking_code: string | null; address: string; city: string },
  newStatus: string,
  statusMessage: string,
  baseUrl: string
): string {
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const trackingUrl = intervention.tracking_code 
    ? `${baseUrl}/track/${intervention.tracking_code}`
    : `${baseUrl}/intervention/${intervention.tracking_code}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mise à jour de votre intervention - Dépan'Express</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #1a1a2e; margin-bottom: 20px;">
          🔔 Mise à jour de votre intervention
        </h1>
        
        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 18px; color: #0369a1;">
            <strong>Nouveau statut :</strong> ${statusLabel}
          </p>
        </div>
        
        <p style="font-size: 16px; color: #333;">${statusMessage}</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1a1a2e;">Détails de l'intervention</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>Référence :</strong> ${intervention.tracking_code || "N/A"}
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Titre :</strong> ${intervention.title}
          </p>
          <p style="margin: 5px 0; color: #666;">
            <strong>Adresse :</strong> ${intervention.address}, ${intervention.city}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackingUrl}" style="background: #1a1a2e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Suivre mon intervention
          </a>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Cet email a été envoyé par Dépan'Express.<br>
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

    console.log(`Status change notification: ${oldStatus} -> ${newStatus} for intervention ${interventionId}`);

    // Don't notify for 'new' status (intervention just created)
    if (newStatus === "new") {
      return new Response(
        JSON.stringify({ success: true, message: "No notification for new status" }),
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

    if (!clientEmail && !clientPhone) {
      console.log("No client contact info available");
      return new Response(
        JSON.stringify({ success: true, message: "No client contact info" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusMessage = STATUS_MESSAGES[newStatus] || `Le statut de votre intervention a changé: ${STATUS_LABELS[newStatus] || newStatus}`;
    const baseUrl = Deno.env.get("SITE_URL") || "https://depanage-rapide.lovable.app";

    const results: { email?: boolean; sms?: boolean } = {};

    // Send email if available
    if (clientEmail) {
      const subject = `Mise à jour: ${intervention.title} - ${STATUS_LABELS[newStatus] || newStatus}`;
      const emailHtml = buildEmailHtml(intervention, newStatus, statusMessage, baseUrl);
      results.email = await sendEmail(clientEmail, subject, emailHtml);
    }

    // Send SMS if available
    if (clientPhone) {
      const smsMessage = `Dépan'Express: ${statusMessage}. Réf: ${intervention.tracking_code || "N/A"}. Suivez votre intervention: ${baseUrl}/track/${intervention.tracking_code}`;
      results.sms = await sendSMS(clientPhone, smsMessage);
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
