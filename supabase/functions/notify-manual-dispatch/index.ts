import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyManualDispatchRequest {
  interventionId: string;
  technicianId: string;
  interventionDetails?: {
    title: string;
    address: string;
    city: string;
    postalCode: string;
    category: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: 'Serrurerie',
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  glazing: 'Vitrerie',
  heating: 'Chauffage',
  aircon: 'Climatisation',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interventionId, technicianId, interventionDetails }: NotifyManualDispatchRequest = await req.json();

    console.log(`[NotifyManualDispatch] Notifying technician ${technicianId} for intervention ${interventionId}`);

    // Get technician info
    const { data: techData, error: techError } = await supabase
      .from('users')
      .select('email, phone, first_name, last_name')
      .eq('id', technicianId)
      .single();

    if (techError || !techData) {
      console.error('[NotifyManualDispatch] Failed to fetch technician:', techError);
      return new Response(
        JSON.stringify({ error: "Technician not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get intervention details if not provided
    let intervention = interventionDetails;
    if (!intervention) {
      const { data: intData, error: intError } = await supabase
        .from('interventions')
        .select('title, address, city, postal_code, category')
        .eq('id', interventionId)
        .single();

      if (intError || !intData) {
        console.error('[NotifyManualDispatch] Failed to fetch intervention:', intError);
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
      };
    }

    const categoryLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
    const results = { sms: false, email: false, push: false };

    // 1. Send SMS via Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber && techData.phone) {
      try {
        let formattedPhone = techData.phone.replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+33' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+33' + formattedPhone;
        }

        const smsMessage = `Mission assignée par le manager: ${categoryLabel} à ${intervention.city}. ${intervention.address}. Ouvrez l'app pour voir les détails.`;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const smsResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: twilioPhoneNumber,
            Body: smsMessage,
          }),
        });

        if (smsResponse.ok) {
          console.log('[NotifyManualDispatch] SMS sent successfully');
          results.sms = true;
        }
      } catch (smsError) {
        console.error('[NotifyManualDispatch] SMS error:', smsError);
      }
    }

    // 2. Send Email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (resendApiKey) {
      try {
        const { Resend } = await import("https://esm.sh/resend@2.0.0");
        const resend = new Resend(resendApiKey as string);

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">📋 Mission Assignée</h1>
            </div>
            
            <div style="padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px;">Bonjour <strong>${techData.first_name}</strong>,</p>
              
              <p style="font-size: 16px;">Un manager vous a assigné une nouvelle mission :</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h2 style="margin-top: 0; color: #1f2937;">${categoryLabel}</h2>
                <p style="margin: 8px 0; color: #6b7280;">
                  <strong>📍 Adresse:</strong> ${intervention.address}<br>
                  ${intervention.postalCode} ${intervention.city}
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280;">
                Cette mission vous a été directement assignée par un manager. 
                Ouvrez l'application Dépan'Express pour voir tous les détails.
              </p>
            </div>
            
            <div style="background: #1f2937; color: white; padding: 15px; text-align: center; border-radius: 8px; margin-top: 10px;">
              <p style="margin: 0; font-size: 12px;">Dépan'Express - Votre partenaire dépannage</p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: `Dépan'Express <${resendFromEmail}>`,
          to: [techData.email],
          subject: `📋 Mission assignée - ${categoryLabel} à ${intervention.city}`,
          html: emailHtml,
        });

        console.log('[NotifyManualDispatch] Email sent successfully');
        results.email = true;
      } catch (emailError) {
        console.error('[NotifyManualDispatch] Email error:', emailError);
      }
    }

    // 3. Send Push via FCM
    const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");
    if (firebaseServerKey) {
      try {
        const { data: pushSubs } = await supabase
          .from('push_subscriptions')
          .select('fcm_token')
          .eq('user_id', technicianId)
          .eq('is_active', true);

        if (pushSubs && pushSubs.length > 0) {
          for (const sub of pushSubs) {
            const pushPayload = {
              to: sub.fcm_token,
              notification: {
                title: '📋 Mission Assignée',
                body: `${categoryLabel} à ${intervention.city} - Assignée par le manager`,
                icon: '/icons/icon-192x192.png',
              },
              data: {
                type: 'manual_dispatch',
                interventionId: interventionId,
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
              results.push = true;
            }
          }
          console.log('[NotifyManualDispatch] Push sent successfully');
        }
      } catch (pushError) {
        console.error('[NotifyManualDispatch] Push error:', pushError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[NotifyManualDispatch] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
