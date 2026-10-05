import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendClientEmail, sendClientSms } from "../_shared/notify/send.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildInvoiceEmailHtml } from "../_shared/email-templates/invoice-email.ts";
import { resolveClientName } from "../_shared/client-name.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  interventionId: string;
}

async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phoneNumber, From: fromNumber, Body: message }),
    });

    if (!response.ok) {
      console.error("Twilio SMS error:", await response.text());
      return false;
    }
    const result = await response.json();
    console.log("SMS sent successfully:", result.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId }: SendInvoiceRequest = await req.json();
    if (!interventionId) {
      return new Response(JSON.stringify({ error: "interventionId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending invoice for intervention ${interventionId}`);

    // Generate invoice PDF via create-invoice function
    const createInvoiceResp = await fetch(`${supabaseUrl}/functions/v1/create-invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ interventionId }),
    });

    if (!createInvoiceResp.ok) {
      const errText = await createInvoiceResp.text();
      console.error("create-invoice failed:", errText);
      throw new Error("Failed to generate invoice");
    }

    const { invoiceBase64 } = await createInvoiceResp.json();
    const invoiceFileName = "Facture.pdf";

    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError || !intervention) {
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

    let b2bContactFirstName: string | null = null;
    let b2bContactLastName: string | null = null;
    if (intervention.b2b_partner_id) {
      const { data: partner } = await supabase
        .from("b2b_partners")
        .select("contact_firstname, contact_lastname")
        .eq("id", intervention.b2b_partner_id)
        .single();
      if (partner) {
        b2bContactFirstName = partner.contact_firstname;
        b2bContactLastName = partner.contact_lastname;
      }
    }

    const clientName = resolveClientName({
      accountFirstName: clientUser?.first_name,
      accountLastName: clientUser?.last_name,
      b2bContactFirstName,
      b2bContactLastName,
      clientFirstName: intervention.client_first_name,
      clientLastName: intervention.client_last_name,
    });
    const trackingCode = intervention.tracking_code || "N/A";
    const finalPrice = intervention.final_price || 0;

    const results = { email: false, sms: false };

    const emailRes = await sendClientEmail({
      supabase,
      interventionId,
      to: clientEmail,
      subject: `Depan.Pro : Facture - Intervention ${trackingCode}`,
      html: buildInvoiceEmailHtml({
        trackingCode,
        clientName,
        address: `${intervention.address || "N/A"}, ${intervention.postal_code} ${intervention.city}`,
        finalPrice,
      }),
      attachments: [{ filename: invoiceFileName, content: invoiceBase64 }],
    });
    results.email = emailRes.sent;

    const smsRes = await sendClientSms({
      supabase,
      interventionId,
      to: clientPhone,
      body: `Depan.Pro - Votre facture pour l'intervention ${trackingCode} est disponible. Montant: ${finalPrice.toFixed(2)} € TTC. Merci pour votre confiance !`,
      context: "[InvoiceEmail]",
    });
    results.sms = smsRes.sent;

    return new Response(
      JSON.stringify({ success: results.email || results.sms, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending invoice:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
