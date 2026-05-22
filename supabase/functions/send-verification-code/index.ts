import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendSMS } from "../_shared/sms/twilio.ts";
import { buildVerificationCodeSms } from "../_shared/sms/templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  phone: string;
}

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 100000).toString().padStart(5, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as RequestBody;
    const { phone } = body;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: existing, error: selectError } = await supabase
      .from('phone_verification_codes')
      .select('id, attempts')
      .eq('phone', phone)
      .maybeSingle();

    if (selectError) {
      console.error('[VerificationCode] DB select error:', selectError);
      return new Response(
        JSON.stringify({ error: 'Échec de la vérification du numéro' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('phone_verification_codes')
        .update({
          code,
          expires_at: expiresAt,
          attempts: (existing.attempts ?? 0) + 1,
          used_at: null,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[VerificationCode] DB update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Échec de la mise à jour du code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('phone_verification_codes')
        .insert({
          phone,
          code,
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error('[VerificationCode] DB insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Échec de l\'enregistrement du code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const message = buildVerificationCodeSms({ code });
    const sent = await sendSMS(phone, message, '[VerificationCode]');

    if (!sent) {
      return new Response(
        JSON.stringify({ error: 'Échec de l\'envoi du SMS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, expiresAt }),
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
