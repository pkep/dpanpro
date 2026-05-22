import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  phone: string;
  code: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as RequestBody;
    const { phone, code } = body;

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: 'phone et code sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: record, error: selectError } = await supabase
      .from('phone_verification_codes')
      .select('id, code, expires_at, used_at')
      .eq('phone', phone)
      .maybeSingle();

    if (selectError) {
      console.error('[CheckVerification] DB select error:', selectError);
      return new Response(
        JSON.stringify({ error: 'Échec de la vérification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!record) {
      return new Response(
        JSON.stringify({ success: false, reason: 'code_not_found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (record.code !== code) {
      return new Response(
        JSON.stringify({ success: false, reason: 'invalid_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    if (record.expires_at && now > record.expires_at) {
      return new Response(
        JSON.stringify({ success: false, reason: 'expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (record.used_at) {
      return new Response(
        JSON.stringify({ success: false, reason: 'already_used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as used
    const { error: updateError } = await supabase
      .from('phone_verification_codes')
      .update({ used_at: now })
      .eq('id', record.id);

    if (updateError) {
      console.error('[CheckVerification] DB update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Échec de la mise à jour' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CheckVerification] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
