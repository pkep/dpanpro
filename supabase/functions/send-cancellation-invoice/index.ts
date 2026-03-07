import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCancellationInvoiceEmailHtml, buildCancellationInvoicePdfHtml } from "../_shared/email-templates/cancellation-invoice.ts";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildCancellationInvoiceSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCancellationInvoiceRequest {
  interventionId: string;
  displacementPriceHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      interventionId, 
      displacementPriceHT,
      vatRate,
      vatAmount,
      totalTTC,
    }: SendCancellationInvoiceRequest = await req.json();

    console.log(`Sending cancellation invoice for intervention ${interventionId}`);

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error("Error fetching intervention:", interventionError);
      throw new Error("Intervention not found");
    }

    let clientUser = null;
    if (intervention.client_id) {
      const { data: user } = await supabase
        .from("users")
        .select("email, phone, first_name, last_name")
        .eq("id", intervention.client_id)
        .single();
      clientUser = user;
    }

    const clientEmail = intervention.client_email || clientUser?.email;
    const clientPhone = intervention.client_phone || clientUser?.phone;
    const clientName = clientUser ? `${clientUser.first_name} ${clientUser.last_name}` : "Client";
    const trackingCode = intervention.tracking_code || "N/A";

    const categoryLabels: Record<string, string> = {
      locksmith: 'Serrurerie',
      plumbing: 'Plomberie',
      electricity: 'Électricité',
      glazing: 'Vitrerie',
      heating: 'Chauffage',
      aircon: 'Climatisation',
    };

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const shortId = interventionId.substring(0, 8).toUpperCase();
    const invoiceNumber = `FAC-ANN-${year}${month}-${shortId}`;
    const invoiceDate = now.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    // Generate invoice PDF HTML (kept for reference/future use)
    const _invoiceHtml = buildCancellationInvoicePdfHtml({
      invoiceNumber,
      invoiceDate,
      trackingCode,
      clientName,
      clientEmail,
      clientPhone,
      address: intervention.address || '',
      city: intervention.city || '',
      postalCode: intervention.postal_code || '',
      category: categoryLabels[intervention.category] || intervention.category,
      displacementPriceHT,
      vatRate,
      vatAmount,
      totalTTC,
    });

    const results = {
      email: false,
      sms: false,
    };

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    
    if (resendApiKey && clientEmail) {
      try {
        const resend = new Resend(resendApiKey);

        const emailResponse = await resend.emails.send({
          from: `Depan.Pro <${resendFromEmail}>`,
          to: [clientEmail],
          subject: `Depan.Pro : Facture d'annulation - ${trackingCode}`,
          html: buildCancellationInvoiceEmailHtml({
            invoiceNumber,
            trackingCode,
            clientName,
            address: intervention.address || '',
            postalCode: intervention.postal_code || '',
            city: intervention.city || '',
            displacementPriceHT,
            vatRate,
            vatAmount,
            totalTTC,
          }),
        });

        console.log("Cancellation invoice email sent successfully:", emailResponse);
        results.email = true;
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("Email not sent: RESEND_API_KEY not configured or no client email");
    }

    if (clientPhone) {
      const smsMessage = buildCancellationInvoiceSms({
        invoiceNumber,
        trackingCode,
        totalTTC,
      });
      results.sms = await sendSMS(clientPhone, smsMessage, "[CancellationInvoice]");
    } else {
      console.log("SMS not sent: no client phone number");
    }

    return new Response(
      JSON.stringify({ 
        success: results.email || results.sms,
        results,
        invoiceNumber,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending cancellation invoice:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
