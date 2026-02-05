import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteEmailRequest {
  interventionId: string;
  quoteBase64: string;
  quoteFileName: string;
  clientEmail: string | null;
  clientPhone: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "contact@depan-pro.com";
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, quoteBase64, quoteFileName, clientEmail, clientPhone }: QuoteEmailRequest = await req.json();

    if (!interventionId || !quoteBase64) {
      throw new Error("Missing required fields");
    }

    // Get intervention details
    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (intError || !intervention) {
      throw new Error("Intervention not found");
    }

    // Get technician name
    let technicianName = "Technicien";
    if (intervention.technician_id) {
      const { data: techData } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", intervention.technician_id)
        .single();
      if (techData) {
        technicianName = `${techData.first_name} ${techData.last_name}`;
      }
    }

    const emailToSend = clientEmail || intervention.client_email;

    if (!emailToSend) {
      console.log("No email address available, skipping email send");
      return new Response(JSON.stringify({ success: true, message: "No email to send to" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email with quote PDF attached
    const emailResponse = await resend.emails.send({
      from: `Depan.Pro <${fromEmail}>`,
      to: [emailToSend],
      subject: `Votre devis d'intervention - ${intervention.tracking_code || interventionId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0FB87F; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .btn { display: inline-block; padding: 12px 24px; background: #0FB87F; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">Depan.Pro</h1>
              <p style="margin:5px 0 0 0;">Votre devis d'intervention</p>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Veuillez trouver ci-joint le devis signé pour votre intervention.</p>
              
              <div class="info-box">
                <p><strong>Référence:</strong> ${intervention.tracking_code || interventionId.slice(0, 8)}</p>
                <p><strong>Adresse:</strong> ${intervention.address}, ${intervention.postal_code} ${intervention.city}</p>
                <p><strong>Technicien:</strong> ${technicianName}</p>
              </div>
              
              <p>Le technicien va maintenant procéder à l'intervention. Vous recevrez une facture une fois celle-ci terminée.</p>
              
              <p>Cordialement,<br/>L'équipe Depan.Pro</p>
            </div>
            <div class="footer">
              <p>Depan.Pro - 7, place du 11 Novembre 1918, 93000 Bobigny</p>
              <p>Tél: 01 84 60 86 30 | Email: contact@depan-pro.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: quoteFileName,
          content: quoteBase64,
        },
      ],
    });

    console.log("Quote email sent successfully:", emailResponse);

    // Send SMS notification if phone available
    if (clientPhone || intervention.client_phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (twilioSid && twilioToken && twilioPhone) {
        const phoneToSend = clientPhone || intervention.client_phone;
        
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const credentials = btoa(`${twilioSid}:${twilioToken}`);

          await fetch(twilioUrl, {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: phoneToSend,
              From: twilioPhone,
              Body: `Depan.Pro: Votre devis a été validé et signé. L'intervention est en cours. Ref: ${intervention.tracking_code || interventionId.slice(0, 8)}`,
            }),
          });

          console.log("SMS notification sent");
        } catch (smsErr) {
          console.error("Error sending SMS:", smsErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-quote-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
