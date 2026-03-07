/**
 * Template: Technician Application Response Email
 * Used by: notify-technician-application
 */

interface TechnicianApplicationTemplateData {
  firstName: string;
  action: "accepted" | "rejected";
  reason?: string;
}

export function buildTechnicianApplicationEmailHtml(data: TechnicianApplicationTemplateData): { subject: string; html: string } {
  const { firstName, action, reason } = data;

  const emailHeader = `
    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 50px; margin-bottom: 15px;" />
  `;

  if (action === "accepted") {
    return {
      subject: "Depan.Pro : Votre candidature a été acceptée 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${emailHeader}
            <h1 style="margin: 0; font-size: 28px;">🎉 Félicitations ${firstName} !</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Nous avons le plaisir de vous informer que votre candidature pour devenir technicien partenaire chez <strong>Depan.Pro</strong> a été acceptée !
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
              Bienvenue dans l'équipe Depan.Pro ! Nous sommes impatients de travailler avec vous.
            </p>
          </div>
          
          <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 12px;">Depan.Pro - Votre partenaire dépannage</p>
          </div>
        </div>
      `,
    };
  }

  return {
    subject: "Depan.Pro : Réponse à votre candidature",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #64748b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png" alt="Depan.Pro" style="height: 50px; margin-bottom: 15px;" />
          <h1 style="margin: 0; font-size: 24px;">Bonjour ${firstName}</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Nous vous remercions pour l'intérêt que vous portez à <strong>Depan.Pro</strong> et pour le temps consacré à votre candidature.
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
          ` : ""}
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            Cette décision ne préjuge en rien de vos compétences. N'hésitez pas à nous recontacter ultérieurement si votre situation évolue.
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Nous vous souhaitons bonne continuation dans vos projets professionnels.
          </p>
        </div>
        
        <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-top: 10px;">
          <p style="margin: 0; font-size: 12px;">Depan.Pro - Votre partenaire dépannage</p>
        </div>
      </div>
    `,
  };
}
