import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  interventionId: string;
  technicianId: string;
  reminderType: 'half_time' | 'five_minutes';
  targetTimeMinutes: number;
  elapsedMinutes: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: ReminderRequest = await req.json();
    const { interventionId, technicianId, reminderType, targetTimeMinutes, elapsedMinutes } = body;

    console.log(`[Arrival Reminder] Type: ${reminderType}, Intervention: ${interventionId}, Technician: ${technicianId}`);

    // Get technician details
    const { data: technician, error: techError } = await supabase
      .from('users')
      .select('email, phone, first_name')
      .eq('id', technicianId)
      .single();

    if (techError || !technician) {
      console.error('[Arrival Reminder] Technician not found:', techError);
      return new Response(
        JSON.stringify({ error: 'Technician not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get intervention details
    const { data: intervention, error: intError } = await supabase
      .from('interventions')
      .select('title, address, city, status, category')
      .eq('id', interventionId)
      .single();

    if (intError || !intervention) {
      console.error('[Arrival Reminder] Intervention not found:', intError);
      return new Response(
        JSON.stringify({ error: 'Intervention not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if intervention is still in progress (not arrived yet)
    if (!['assigned', 'on_route'].includes(intervention.status)) {
      console.log(`[Arrival Reminder] Skipping - intervention status is ${intervention.status}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Intervention already arrived or completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const remainingMinutes = targetTimeMinutes - elapsedMinutes;
    
    // Prepare reminder message based on type
    let smsMessage: string;
    let emailSubject: string;
    let emailBody: string;
    
    if (reminderType === 'half_time') {
      smsMessage = `⏰ Rappel: Il vous reste ${remainingMinutes} min pour arriver chez le client (${intervention.address}, ${intervention.city}). Objectif: ${targetTimeMinutes} min.`;
      emailSubject = `Rappel - Mi-parcours: ${intervention.title}`;
      emailBody = `
        <p>Bonjour ${technician.first_name},</p>
        <p>Vous avez accepté l'intervention il y a <strong>${elapsedMinutes} minutes</strong>.</p>
        <p>Il vous reste environ <strong>${remainingMinutes} minutes</strong> pour atteindre le temps cible de ${targetTimeMinutes} minutes.</p>
        <p><strong>Adresse:</strong> ${intervention.address}, ${intervention.city}</p>
        <p>Merci de respecter les délais promis au client.</p>
      `;
    } else {
      smsMessage = `🚨 URGENT: Plus que 5 min pour arriver chez le client! (${intervention.address}, ${intervention.city}). Le client vous attend.`;
      emailSubject = `⚠️ Urgent - 5 min restantes: ${intervention.title}`;
      emailBody = `
        <p>Bonjour ${technician.first_name},</p>
        <p><strong>Il ne vous reste que 5 minutes</strong> pour atteindre le temps cible de ${targetTimeMinutes} minutes.</p>
        <p><strong>Adresse:</strong> ${intervention.address}, ${intervention.city}</p>
        <p>Le client vous attend. Merci de faire au plus vite.</p>
      `;
    }

    const results = { sms: false, email: false, push: false };

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber && technician.phone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const smsResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: technician.phone,
            From: twilioPhoneNumber,
            Body: smsMessage,
          }),
        });

        if (smsResponse.ok) {
          results.sms = true;
          console.log('[Arrival Reminder] SMS sent successfully');
        } else {
          const smsError = await smsResponse.text();
          console.error('[Arrival Reminder] SMS error:', smsError);
        }
      } catch (smsErr) {
        console.error('[Arrival Reminder] SMS exception:', smsErr);
      }
    }

    // Send Email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

    if (resendApiKey && resendFromEmail && technician.email) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [technician.email],
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (emailResponse.ok) {
          results.email = true;
          console.log('[Arrival Reminder] Email sent successfully');
        } else {
          const emailError = await emailResponse.text();
          console.error('[Arrival Reminder] Email error:', emailError);
        }
      } catch (emailErr) {
        console.error('[Arrival Reminder] Email exception:', emailErr);
      }
    }

    // Send Push Notification
    const { data: pushSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', technicianId)
      .eq('is_active', true);

    if (pushSubscriptions && pushSubscriptions.length > 0) {
      const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
      if (firebaseServerKey) {
        try {
          for (const sub of pushSubscriptions) {
            const pushResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Authorization': `key=${firebaseServerKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: sub.fcm_token,
                notification: {
                  title: reminderType === 'half_time' ? '⏰ Rappel temps d\'arrivée' : '🚨 Temps d\'arrivée critique',
                  body: reminderType === 'half_time' 
                    ? `Il reste ${remainingMinutes} min pour arriver (objectif: ${targetTimeMinutes} min)`
                    : `Plus que 5 min! Le client vous attend.`,
                  icon: '/icons/icon-192x192.png',
                },
                data: {
                  type: 'arrival_reminder',
                  interventionId,
                  reminderType,
                },
              }),
            });

            if (pushResponse.ok) {
              results.push = true;
              console.log('[Arrival Reminder] Push notification sent');
            }
          }
        } catch (pushErr) {
          console.error('[Arrival Reminder] Push exception:', pushErr);
        }
      }
    }

    console.log(`[Arrival Reminder] Results:`, results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        reminderType,
        targetTimeMinutes,
        elapsedMinutes,
        remainingMinutes 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Arrival Reminder] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
