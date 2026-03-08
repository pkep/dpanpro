/**
 * Template: Email Verification
 * Sent after registration to confirm the user's email address.
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface EmailVerificationTemplateData {
  firstName: string;
  verificationUrl: string;
}

export function buildEmailVerificationHtml(data: EmailVerificationTemplateData): string {
  const { firstName, verificationUrl } = data;

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px; font-weight: 600;">
      Bienvenue ${firstName} !
    </h2>
    
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      Merci de vous être inscrit sur Depan.Pro. Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
    </p>
    
    <!-- Warning -->
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Important :</strong> Ce lien est valable <strong>15 minutes</strong>. Passé ce délai, vous devrez demander un nouveau lien de vérification.
      </p>
    </div>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
        Confirmer mon email
      </a>
    </div>
    
    <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px; text-align: center;">
      Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
    </p>
    <p style="margin: 0 0 24px; color: #6b7280; font-size: 12px; text-align: center; word-break: break-all;">
      ${verificationUrl}
    </p>
    
    <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
      Si vous n'êtes pas à l'origine de cette inscription, veuillez ignorer cet email.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Confirmez votre email",
    headerSubtitle: "Activez votre compte Depan.Pro",
    headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
    bodyContent,
  });
}
