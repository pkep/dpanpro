import { describe, expect, it } from "vitest";
import {
  B2B_VAT_RATE,
  computeB2bVat,
  toB2bHtFromTtc,
} from "../../supabase/functions/_shared/b2b-vat.ts";

describe("toB2bHtFromTtc", () => {
  it("retire la TVA de 20 % pour un partenaire standard", () => {
    expect(B2B_VAT_RATE).toBe(20);
    // HOSTOPIA : intervention facturée 192,00 € TTC au client → 160,00 € HT en B2B.
    expect(toB2bHtFromTtc(192, false)).toBe(160);
    // PODINA : 150,00 € TTC → 125,00 € HT.
    expect(toB2bHtFromTtc(150, false)).toBe(125);
  });

  it("facture le TTC tel quel en HT pour une entreprise de construction", () => {
    // Autoliquidation de TVA (BTP) : aucun retrait de taxe.
    expect(toB2bHtFromTtc(160, true)).toBe(160);
    expect(toB2bHtFromTtc(150, true)).toBe(150);
  });

  it("arrondit au centime et tolère un montant absent", () => {
    expect(toB2bHtFromTtc(100, false)).toBe(83.33);
    expect(toB2bHtFromTtc(0, false)).toBe(0);
    expect(toB2bHtFromTtc(null as unknown as number, false)).toBe(0);
  });

  it("retrouve le TTC client quand la ligne HT repasse par computeB2bVat", () => {
    const ht = toB2bHtFromTtc(192, false);
    const vat = computeB2bVat(ht, false);
    expect(vat.vatAmount).toBe(32);
    expect(vat.totalTtc).toBe(192);
    expect(vat.vatRate).toBe(20);
  });

  it("garantit TVA nulle et TTC = HT en autoliquidation", () => {
    const vat = computeB2bVat(toB2bHtFromTtc(160, true), true);
    expect(vat.vatAmount).toBe(0);
    expect(vat.totalTtc).toBe(160);
    expect(vat.vatRate).toBe(0);
    expect(vat.vatExempt).toBe(true);
  });
});
