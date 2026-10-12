import logoUrl from '@/assets/logo.png';

/** Dimensions (mm) des images insérées dans les PDF devis/facture. */
export const PDF_LOGO_WIDTH = 18;
export const PDF_LOGO_HEIGHT = 18;
export const PDF_CERTIFIE_WIDTH = 40;
export const PDF_CERTIFIE_HEIGHT = 14;

export interface PdfAssets {
  /** Data URL PNG du logo. */
  logo: string;
  /** Data URL JPEG du badge « certifié ». */
  certifie: string;
}

let cache: Promise<PdfAssets> | null = null;

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Badge « Signature certifiée » dessiné à la volée (vert Depan.Pro). */
function drawCertifieBadge(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 400, 140);
  ctx.strokeStyle = '#0FB87F';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 388, 128);
  ctx.fillStyle = '#0FB87F';
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Helvetica, Arial, sans-serif';
  ctx.fillText('✓ CERTIFIÉ', 200, 70);
  ctx.font = '26px Helvetica, Arial, sans-serif';
  ctx.fillText('Signature électronique', 200, 110);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Charge (une seule fois) les images utilisées par les PDF. */
export function loadPdfAssets(): Promise<PdfAssets> {
  if (!cache) {
    cache = (async () => ({
      logo: await urlToDataUrl(logoUrl),
      certifie: drawCertifieBadge(),
    }))().catch((err) => {
      cache = null;
      throw err;
    });
  }
  return cache;
}
