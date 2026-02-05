import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@depan-pro.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager";
  tempPassword: string;
  loginUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, role, tempPassword, loginUrl }: WelcomeEmailRequest = await req.json();

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !tempPassword) {
      return new Response(JSON.stringify({ error: "Champs requis manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleLabel = role === "admin" ? "Administrateur" : "Manager";

    const emailResponse = await resend.emails.send({
      from: `DépanPro <${fromEmail}>`,
      to: [email],
      subject: `Bienvenue sur DépanPro - Votre compte ${roleLabel}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">DépanPro</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 32px;">
                      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">
                        Bienvenue ${firstName} !
                      </h2>
                      
                      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Votre compte <strong>${roleLabel}</strong> a été créé sur la plateforme DépanPro. Vous pouvez maintenant accéder à votre espace de gestion.
                      </p>
                      
                      <!-- Credentials Box -->
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                        <p style="margin: 0 0 12px; color: #18181b; font-size: 14px; font-weight: 600;">
                          Vos identifiants de connexion :
                        </p>
                        <p style="margin: 0 0 8px; color: #52525b; font-size: 14px;">
                          <strong>Email :</strong> ${email}
                        </p>
                        <p style="margin: 0; color: #52525b; font-size: 14px;">
                          <strong>Mot de passe temporaire :</strong> 
                          <code style="background-color: #e4e4e7; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #18181b;">${tempPassword}</code>
                        </p>
                      </div>
                      
                      <!-- Warning -->
                      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                          <strong>Important :</strong> Lors de votre première connexion, vous devrez changer ce mot de passe temporaire pour un mot de passe personnel.
                        </p>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin-bottom: 24px;">
                        <a href="${loginUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                          Se connecter
                        </a>
                      </div>
                      
                      <p style="margin: 0; color: #a1a1aa; font-size: 14px; text-align: center;">
                        Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f4f4f5; padding: 24px 32px; text-align: center;">
                      <p style="margin: 0; color: #71717a; font-size: 12px;">
                        © ${new Date().getFullYear()} DépanPro. Tous droits réservés.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur lors de l'envoi de l'email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
