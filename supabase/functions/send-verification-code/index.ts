import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildVerificationCodeSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  phone: string;
  code: string;
  interventionType: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as RequestBody;
    const { phone, code, interventionType } = body;

    if (!phone || !code || !interventionType) {
      return new Response(
        JSON.stringify({ error: 'phone, code et interventionType sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^\d{5}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Le code doit contenir 5 chiffres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = buildVerificationCodeSms({ code, interventionType });
    const sent = await sendSMS(phone, message, '[VerificationCode]');

    if (!sent) {
      return new Response(
        JSON.stringify({ error: 'Échec de l\'envoi du SMS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[VerificationCode] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
