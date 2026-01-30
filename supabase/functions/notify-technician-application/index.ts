import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyApplicationRequest {
  technicianId: string;
  action: 'accepted' | 'rejected';
  email: string;
  firstName: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.log('[NotifyTechnicianApplication] Resend not configured');
      return new Response(
        JSON.stringify({ success: true, message: "Email not sent - Resend not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dynamic import of Resend
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey as string);
    const { technicianId, action, email, firstName, reason }: NotifyApplicationRequest = await req.json();

    console.log(`[NotifyTechnicianApplication] Sending ${action} email to ${email}`);

    let subject: string;
    let htmlContent: string;

    if (action === 'accepted') {
      subject = "🎉 Votre candidature a été acceptée - Dépan'Express";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Félicitations ${firstName} !</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Nous avons le plaisir de vous informer que votre candidature pour devenir technicien partenaire chez <strong>Dépan'Express</strong> a été acceptée !
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h2 style="margin-top: 0; color: #1f2937; font-size: 18px;">Prochaines étapes :</h2>
              <ul style="color: #4b5563; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Connectez-vous à votre espace technicien avec vos identifiants</li>
                <li style="margin-bottom: 10px;">Complétez votre profil si nécessaire</li>
                <li style="margin-bottom: 10px;">Activez vos disponibilités pour recevoir des missions</li>
                <li>Vous recevrez des notifications dès qu'une mission sera disponible dans votre zone</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Bienvenue dans l'équipe Dépan'Express ! Nous sommes impatients de travailler avec vous.
            </p>
          </div>
          
          <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px;">Dépan'Express - Votre partenaire dépannage</p>
          </div>
        </div>
      `;
    } else {
      subject = "Réponse à votre candidature - Dépan'Express";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #64748b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Bonjour ${firstName}</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Nous vous remercions pour l'intérêt que vous portez à <strong>Dépan'Express</strong> et pour le temps consacré à votre candidature.
            </p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Après examen attentif de votre dossier, nous avons le regret de vous informer que nous ne pouvons pas donner suite à votre candidature pour le moment.
            </p>
            
            ${reason ? `
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #4b5563; font-style: italic;">
                  "${reason}"
                </p>
              </div>
            ` : ''}
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Cette décision ne préjuge en rien de vos compétences. N'hésitez pas à nous recontacter ultérieurement si votre situation évolue.
            </p>
            
            <p style="font-size: 14px; color: #6b7280;">
              Nous vous souhaitons bonne continuation dans vos projets professionnels.
            </p>
          </div>
          
          <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px;">Dépan'Express - Votre partenaire dépannage</p>
          </div>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: `Dépan'Express <${resendFromEmail}>`,
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log(`[NotifyTechnicianApplication] Email sent:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[NotifyTechnicianApplication] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
