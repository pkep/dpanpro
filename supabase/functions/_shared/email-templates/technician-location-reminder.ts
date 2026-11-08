import { wrapInBaseLayout } from "./base-layout.ts";

export function buildTechnicianLocationReminderEmail(data: {
  firstName: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
  return {
    subject: "Depan.Pro : Actualisez votre position",
    html: wrapInBaseLayout({
      headerTitle: "Actualisez votre position",
      bodyContent: `<p>Bonjour ${escape(data.firstName)},</p>
        <p>Votre position permet de vous proposer des missions à proximité. Connectez-vous à votre espace technicien et actualisez votre position.</p>
        <p><a href="${escape(data.loginUrl)}">Ouvrir mon espace technicien</a></p>`,
    }),
  };
}