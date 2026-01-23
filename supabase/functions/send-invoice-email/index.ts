import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  interventionId: string;
  invoiceBase64: string;
  invoiceFileName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, invoiceBase64, invoiceFileName }: SendInvoiceRequest = await req.json();

    console.log(`Sending invoice email for intervention ${interventionId}`);

    // Get intervention details with client info
    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*, users!interventions_client_id_fkey(*)")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error("Error fetching intervention:", interventionError);
      throw new Error("Intervention not found");
    }

    const clientEmail = intervention.client_email || intervention.users?.email;
    const clientName = intervention.client_name || intervention.users?.name || "Client";

    if (!clientEmail) {
      console.log("No client email found, skipping email");
      return new Response(
        JSON.stringify({ success: false, error: "No client email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build email HTML
    const trackingCode = intervention.tracking_code || "N/A";
    const finalPrice = intervention.final_price || 0;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .invoice-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .total { font-size: 24px; color: #1a56db; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Facture - Intervention ${trackingCode}</h1>
          </div>
          <div class="content">
            <p>Bonjour ${clientName},</p>
            
            <p>Nous vous remercions pour votre confiance. Veuillez trouver ci-joint la facture correspondant à votre intervention de dépannage.</p>
            
            <div class="invoice-info">
              <p><strong>Référence :</strong> ${trackingCode}</p>
              <p><strong>Adresse :</strong> ${intervention.address || "N/A"}</p>
              <p class="total">Montant total : ${finalPrice.toFixed(2)} € TTC</p>
            </div>
            
            <p>La facture est jointe à cet email au format PDF.</p>
            
            <p>Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
            
            <p>Cordialement,<br>L'équipe Dépannage Express</p>
          </div>
          <div class="footer">
            <p>Dépannage Express - Service de dépannage à domicile</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with PDF attachment
    const emailResponse = await resend.emails.send({
      from: "Dépannage Express <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Facture - Intervention ${trackingCode}`,
      html: emailHtml,
      attachments: [
        {
          filename: invoiceFileName,
          content: invoiceBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
