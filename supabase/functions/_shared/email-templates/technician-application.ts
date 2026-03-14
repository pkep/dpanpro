/**
 * Template: Technician Application Response Email
 * Used by: notify-technician-application
 */
import { wrapInBaseLayout } from "./base-layout.ts";

interface TechnicianApplicationTemplateData {
  firstName: string;
  action: "accepted" | "rejected";
  reason?: string;
  activationUrl?: string;
}

export function buildTechnicianApplicationEmailHtml(data: TechnicianApplicationTemplateData): { subject: string; html: string } {
  const { firstName, action, reason, activationUrl } = data;

  if (action === "accepted") {
    const bodyContent = `
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Nous avons le plaisir de vous informer que votre candidature pour devenir technicien partenaire chez <strong>Depan.Pro</strong> a été acceptée !
      </p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px;">Activez votre compte</h2>
        <p style="color: #4b5563; margin: 0 0 16px 0;">
          Pour finaliser votre inscription et accéder à votre espace technicien, veuillez activer votre compte en cliquant sur le bouton ci-dessous.
        </p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${activationUrl || '#'}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Activer mon compte
          </a>
        </div>
      </div>
      
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Important :</strong> Ce lien est valable <strong>15 minutes</strong>. Passé ce délai, vous devrez contacter le support pour obtenir un nouveau lien.
        </p>
      </div>

      <h3 style="margin: 24px 0 12px 0; color: #1f2937; font-size: 16px;">Après activation :</h3>
      <ul style="color: #4b5563; padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 10px;">Connectez-vous à votre espace technicien avec vos identifiants</li>
        <li style="margin-bottom: 10px;">Complétez votre profil si nécessaire</li>
        <li style="margin-bottom: 10px;">Activez vos disponibilités pour recevoir des missions</li>
        <li>Vous recevrez des notifications dès qu'une mission sera disponible dans votre zone</li>
      </ul>

      ${activationUrl ? `
      <p style="margin: 20px 0 8px; color: #9ca3af; font-size: 13px; text-align: center;">
        Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
      </p>
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 12px; text-align: center; word-break: break-all;">
        ${activationUrl}
      </p>
      ` : ''}
      
      <p style="font-size: 14px; color: #6b7280;">
        Bienvenue dans l'équipe Depan.Pro ! Nous sommes impatients de travailler avec vous.
      </p>
    `;

    return {
      subject: "Depan.Pro : Votre candidature a été acceptée 🎉 — Activez votre compte",
      html: wrapInBaseLayout({
        headerTitle: `🎉 Félicitations ${firstName} !`,
        headerBgGradient: "linear-gradient(135deg, #22c55e, #16a34a)",
        bodyContent,
      }),
    };
  }

  const bodyContent = `
    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
      Nous vous remercions pour l'intérêt que vous portez à <strong>Depan.Pro</strong> et pour le temps consacré à votre candidature.
    </p>
    
    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
      Après examen attentif de votre dossier, nous avons le regret de vous informer que nous ne pouvons pas donner suite à votre candidature pour le moment.
    </p>
    
    ${reason ? `
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0; color: #4b5563; font-style: italic;">"${reason}"</p>
      </div>
    ` : ""}
    
    <p style="font-size: 14px; color: #6b7280;">
      Cette décision ne préjuge en rien de vos compétences. N'hésitez pas à nous recontacter ultérieurement si votre situation évolue.
    </p>
    <p style="font-size: 14px; color: #6b7280;">
      Nous vous souhaitons bonne continuation dans vos projets professionnels.
    </p>
  `;

  return {
    subject: "Depan.Pro : Réponse à votre candidature",
    html: wrapInBaseLayout({
      headerTitle: `Bonjour ${firstName}`,
      headerBgColor: "#64748b",
      bodyContent,
    }),
  };
}
