import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildPasswordResetEmailHtml } from "../_shared/email-templates/password-reset.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate a secure token with at least one uppercase, one lowercase, and one special character
function generateSecureToken(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const special = '!@#$%&*';
  const allChars = uppercase + lowercase + special + '0123456789';
  
  // Ensure at least one of each required character type
  let token = '';
  token += uppercase[Math.floor(Math.random() * uppercase.length)];
  token += lowercase[Math.floor(Math.random() * lowercase.length)];
  token += special[Math.floor(Math.random() * special.length)];
  
  // Fill the remaining 6 characters randomly
  for (let i = 0; i < 6; i++) {
    token += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the token to randomize positions
  return token.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl } = await req.json();
    
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Always return success to prevent email enumeration attacks
    if (userError || !user) {
      console.log('User not found or error:', email);
      return new Response(
        JSON.stringify({ success: true, message: 'If this email exists, a reset link has been sent.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalidate any existing tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null);

    // Generate token and expiry (10 minutes)
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store token in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Error inserting token:', insertError);
      throw new Error('Failed to create reset token');
    }

    // Build reset URL
    const fullResetUrl = `${resetUrl}?token=${encodeURIComponent(token)}`;

    // Send email via Resend
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const { error: emailError } = await resend.emails.send({
        from: `Depan.Pro <${resendFromEmail}>`,
        to: [user.email],
        subject: 'Depan.Pro : Réinitialisation de votre mot de passe',
        html: buildPasswordResetEmailHtml({
          firstName: user.first_name || '',
          resetUrl: fullResetUrl,
        }),
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
      } else {
        console.log('Password reset email sent successfully to:', user.email);
      }
    } else {
      console.log('RESEND_API_KEY not configured, token generated:', token);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'If this email exists, a reset link has been sent.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-password-reset:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
