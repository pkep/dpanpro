/**
 * Template: Welcome Admin/Manager Email
 * Used by: send-welcome-admin-email
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface WelcomeAdminTemplateData {
  firstName: string;
  email: string;
  roleLabel: string;
  tempPassword: string;
  loginUrl: string;
}

export function buildWelcomeAdminEmailHtml(data: WelcomeAdminTemplateData): string {
  const { firstName, email, roleLabel, tempPassword, loginUrl } = data;

  const bodyContent = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px; font-weight: 600;">
      Bienvenue ${firstName} !
    </h2>
    
    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
      Votre compte <strong>${roleLabel}</strong> a été créé sur la plateforme Depan.Pro. Vous pouvez maintenant accéder à votre espace de gestion.
    </p>
    
    <!-- Credentials Box -->
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px; color: #1f2937; font-size: 14px; font-weight: 600;">
        Vos identifiants de connexion :
      </p>
      <p style="margin: 0 0 8px; color: #374151; font-size: 14px;">
        <strong>Email :</strong> ${email}
      </p>
      <p style="margin: 0; color: #374151; font-size: 14px;">
        <strong>Mot de passe temporaire :</strong> 
        <code style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #1f2937;">${tempPassword}</code>
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
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
        Se connecter
      </a>
    </div>
    
    <p style="margin: 0; color: #9ca3af; font-size: 14px; text-align: center;">
      Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Depan.Pro",
    headerSubtitle: `Votre compte ${roleLabel}`,
    headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
    bodyContent,
  });
}
