import { wrapInBaseLayout } from "./base-layout.ts";

export function buildTechnicianReconnectReminderEmail(data: {
  firstName: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
  return {
    subject: "Depan.Pro : Reconnectez-vous à votre espace technicien",
    html: wrapInBaseLayout({
      headerTitle: "Votre espace technicien",
      bodyContent: `<p>Bonjour ${escape(data.firstName)},</p>
        <p>Nous ne vous avons pas vu connecté récemment. Retrouvez votre espace technicien pour consulter vos missions et mettre à jour vos disponibilités.</p>
        <p><a href="${escape(data.loginUrl)}">Ouvrir mon espace technicien</a></p>`,
    }),
  };
}