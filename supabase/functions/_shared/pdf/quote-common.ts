import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveClientName } from "../client-name.ts";
import { ensureDocumentNumber } from "../document-number.ts";
import { renderDocumentPdf } from "./document-layout.ts";
import { quoteB2bConfig } from "./quote-b2b.ts";
import { quoteB2cConfig } from "./quote-b2c.ts";

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: "Serrurerie",
  plumbing: "Plomberie",
  electricity: "Électricité",
  glazing: "Vitrerie",
  heating: "Chauffage",
  aircon: "Climatisation",
};

export async function renderQuotePdf(interventionId: string) {
  if (!interventionId || typeof interventionId !== "string") {
    throw new Error("interventionId required");
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {

    const { data: intervention, error: intErr } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();
    if (intErr || !intervention) throw new Error("Intervention not found");

    const { data: quoteLinesRaw } = await supabase
      .from("intervention_quotes")
      .select("*")
      .eq("intervention_id", interventionId)
      .order("display_order", { ascending: true });
    const quoteLines = quoteLinesRaw || [];

    const { data: modsRaw } = await supabase
      .from("quote_modifications")
      .select("*")
      .eq("intervention_id", interventionId)
      .eq("status", "approved");
    const mods = modsRaw || [];

    const modIds = mods.map((m: any) => m.id);
    let modItems: any[] = [];
    if (modIds.length > 0) {
      const { data: itemsRaw } = await supabase
        .from("quote_modification_items")
        .select("*")
        .in("modification_id", modIds);
      modItems = itemsRaw || [];
    }

    let technicianName = "Non assigné";
    if (intervention.technician_id) {
      const { data: tech } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", intervention.technician_id)
        .single();
      if (tech) technicianName = `${tech.first_name} ${tech.last_name}`;
    }

    let accountFirstName: string | null = null;
    let accountLastName: string | null = null;
    let isCompany = false;
    let companyName: string | null = null;
    let siren: string | null = null;
    let vatNumber: string | null = null;
    let clientAddress: string | null = null;
    let clientEmail: string | null = intervention.client_email;
    let clientPhone: string | null = intervention.client_phone;

    if (intervention.client_id) {
      const { data: client } = await supabase
        .from("users")
        .select("first_name, last_name, email, phone, is_company, company_name, company_address, siren, vat_number")
        .eq("id", intervention.client_id)
        .single();
      if (client) {
        accountFirstName = client.first_name;
        accountLastName = client.last_name;
        isCompany = client.is_company || false;
        companyName = client.company_name;
        siren = client.siren;
        vatNumber = client.vat_number;
        clientAddress = client.company_address;
        clientEmail = clientEmail || client.email;
        clientPhone = clientPhone || client.phone;
      }
    }

    let b2bContactFirstName: string | null = null;
    let b2bContactLastName: string | null = null;
    let constructionCompany = false;
    if (intervention.b2b_partner_id) {
      const { data: partner } = await supabase
        .from("b2b_partners")
        .select("company_name, address, postal_code, city, siret, vat_number, contact_firstname, contact_lastname, contact_phone, contact_email, construction_company")
        .eq("id", intervention.b2b_partner_id)
        .single();
      if (partner) {
        b2bContactFirstName = partner.contact_firstname;
        b2bContactLastName = partner.contact_lastname;
        constructionCompany = partner.construction_company === true;
        isCompany = true;
        companyName = partner.company_name || companyName;
        siren = partner.siret || siren;
        vatNumber = partner.vat_number || vatNumber;
        clientAddress = [partner.address, [partner.city, partner.postal_code].filter(Boolean).join(" ")]
                    .filter(Boolean).join(", ");
        clientPhone = clientPhone || partner.contact_phone || null;
        clientEmail = clientEmail || partner.contact_email || null;
      }
    }

    const clientName = resolveClientName({
      accountFirstName,
      accountLastName,
      b2bContactFirstName,
      b2bContactLastName,
      clientFirstName: intervention.client_first_name,
      clientLastName: intervention.client_last_name,
    });

    let vatRate = isCompany ? 20 : 10;
    const { data: service } = await supabase
      .from("services")
      .select("vat_rate_individual, vat_rate_professional")
      .eq("code", intervention.category)
      .eq("is_active", true)
      .maybeSingle();
    if (service) {
      vatRate = isCompany ? service.vat_rate_professional : service.vat_rate_individual;
    }

    const baseTotal = quoteLines.reduce((s: number, l: any) => s + Number(l.calculated_price), 0);
    const additionalTotal = mods.reduce((s: number, m: any) => s + Number(m.total_additional_amount), 0);
    const totalHT = baseTotal + additionalTotal;
    // B2B « entreprise de construction » → autoliquidation de TVA (art. 283-2 nonies du CGI).
    const vatExempt = constructionCompany;
    if (vatExempt) vatRate = 0;
    const tva = vatExempt ? 0 : totalHT * (vatRate / 100);
    const totalTTC = totalHT + tva;

    const quoteDate = intervention.quote_signed_at
      ? new Date(intervention.quote_signed_at)
      : intervention.created_at
        ? new Date(intervention.created_at)
        : new Date();
    const quoteNumber = await ensureDocumentNumber(supabase, interventionId, "quote");

    const isB2b = Boolean(intervention.b2b_partner_id);
    const config = isB2b ? quoteB2bConfig : quoteB2cConfig;
    const serviceLabel = CATEGORY_LABELS[intervention.category] || intervention.category;
    const quoteBase64 = renderDocumentPdf({
      title: "DEVIS",
      numberLabel: "Devis N°",
      number: quoteNumber,
      date: quoteDate,
      clientLabel: "Devis pour :",
      metaLines: [],
      service: serviceLabel,
      address: intervention.address || "",
      city: intervention.city || "",
      postalCode: intervention.postal_code || "",
      phone: clientPhone || "",
      tracking: intervention.tracking_code || "",
      technician: technicianName,
      showCompanyDetails: config.showCompanyDetails,
      client: {
        name: clientName,
        company: companyName,
        email: clientEmail,
        phone: clientPhone,
        address: clientAddress,
        vatNumber: vatNumber,
      },
      lines: [
        ...quoteLines.map((line: any) => ({
          label: line.label || "Prestation",
          description: line.description,
          quantity: Number(line.multiplier ?? 1),
          unitPrice: Number(line.base_price ?? 0),
          total: Number(line.calculated_price ?? 0),
        })),
        ...modItems.map((item: any) => ({
          label: item.label || "Prestation",
          description: item.description,
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(item.unit_price ?? 0),
          total: Number(item.total_price ?? 0),
        })),
      ],
      totalHT,
      vatRate,
      vat: tva,
      totalTTC,
      vatExempt,
      conditionsTitle: config.conditionsTitle,
      conditionsLines: [...config.conditionsLines],
      signature: {
        data: intervention.quote_signature_data,
        id: intervention.quote_signature_id,
        place: intervention.city,
        date: intervention.quote_signed_at ? new Date(intervention.quote_signed_at) : null,
      },
    });
    const quoteFileName = `devis-${quoteNumber}.pdf`;
    return { quoteBase64, quoteFileName, quoteNumber };
  } catch (error) {
    console.error("render quote error:", error);
    throw error;
  }
}
