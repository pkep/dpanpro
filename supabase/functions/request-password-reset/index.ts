import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 50px;" />
              </div>
              
              <h1 style="color: #333; margin-bottom: 24px; font-size: 24px;">Réinitialisation de mot de passe</h1>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">Bonjour ${user.first_name || ''},</p>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${fullResetUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Réinitialiser mon mot de passe
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Ce lien expire dans <strong>10 minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
              </p>
              
              <p style="color: #999; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
                Cet email a été envoyé automatiquement par Depan.Pro. Si vous n'avez pas fait cette demande, vous pouvez ignorer ce message.
              </p>
            </div>
          </body>
          </html>
        `,
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
