/**
 * Template: Password Reset Email
 * Used by: request-password-reset
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface PasswordResetData {
  firstName: string;
  resetUrl: string;
}

export function buildPasswordResetEmailHtml(data: PasswordResetData): string {
  const { firstName, resetUrl } = data;

  const bodyContent = `
    <p style="font-size: 16px; color: #374151;">Bonjour ${firstName || ""},</p>
    
    <p style="font-size: 16px; color: #374151;">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0FB87F, #0a9e6a); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Réinitialiser mon mot de passe
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Ce lien expire dans <strong>10 minutes</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
    </p>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
      Cet email a été envoyé automatiquement par Depan.Pro. Si vous n'avez pas fait cette demande, vous pouvez ignorer ce message.
    </p>
  `;

  return wrapInBaseLayout({
    headerTitle: "Réinitialisation de mot de passe",
    headerBgGradient: "linear-gradient(135deg, #0FB87F 0%, #0a9e6a 100%)",
    bodyContent,
  });
}
