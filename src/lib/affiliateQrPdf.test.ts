import { expect, it } from 'vitest';
import { buildAffiliateEmailAttachments } from './affiliateQrPdf';

it('returns actual PDF and PNG attachment payloads without data URI prefixes', async () => {
  const result = await buildAffiliateEmailAttachments('PROMO', 'https://example.com/new-intervention?promo=PROMO');
  expect(atob(result.pdfBase64).startsWith('%PDF-')).toBe(true);
  expect(atob(result.qrPngBase64).slice(1, 4)).toBe('PNG');
});