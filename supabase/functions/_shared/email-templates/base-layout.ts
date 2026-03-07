/**
 * Base Email Layout Template
 * Provides a consistent header, footer, and structure for all Depan.Pro emails.
 * Each email only needs to provide the body content and a header title/subtitle.
 */

const LOGO_URL = "https://dpanpro.lovable.app/lovable-uploads/d21193e1-62b9-49fe-854f-eb8275099db9.png";
const BRAND_COLOR = "#0FB87F";
const BRAND_NAME = "Depan.Pro";

interface BaseLayoutOptions {
  /** Main title displayed in the header */
  headerTitle: string;
  /** Optional subtitle below the title */
  headerSubtitle?: string;
  /** Optional header background color override (default: brand green) */
  headerBgColor?: string;
  /** Optional header background gradient (overrides headerBgColor) */
  headerBgGradient?: string;
  /** The main HTML body content */
  bodyContent: string;
  /** Optional: hide the logo in the header */
  hideLogo?: boolean;
}

export function wrapInBaseLayout(options: BaseLayoutOptions): string {
  const {
    headerTitle,
    headerSubtitle,
    headerBgColor = BRAND_COLOR,
    headerBgGradient,
    bodyContent,
    hideLogo = false,
  } = options;

  const bgStyle = headerBgGradient
    ? `background: ${headerBgGradient};`
    : `background-color: ${headerBgColor};`;

  const logoHtml = hideLogo
    ? ""
    : `<img src="${LOGO_URL}" alt="${BRAND_NAME}" style="height: 50px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;" />`;

  const subtitleHtml = headerSubtitle
    ? `<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${headerSubtitle}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- HEADER -->
          <tr>
            <td style="${bgStyle} color: #ffffff; padding: 30px; text-align: center;">
              ${logoHtml}
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">${headerTitle}</h1>
              ${subtitleHtml}
            </td>
          </tr>
          
          <!-- BODY -->
          <tr>
            <td style="padding: 32px;">
              ${bodyContent}
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background-color: #1f2937; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #d1d5db; font-size: 12px; font-weight: 600;">${BRAND_NAME} — Votre partenaire dépannage</p>
              <p style="margin: 0 0 4px 0; color: #9ca3af; font-size: 11px;">7, place du 11 Novembre 1918, 93000 Bobigny</p>
              <p style="margin: 0 0 4px 0; color: #9ca3af; font-size: 11px;">Tél : 01 84 60 86 30 | contact@depan-pro.com</p>
              <p style="margin: 0; color: #6b7280; font-size: 10px;">SIREN : 992 525 576 | TVA : FR41 992 525 576</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { LOGO_URL, BRAND_COLOR, BRAND_NAME };
