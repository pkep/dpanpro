import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { resolveClientName } from "../_shared/client-name.ts";
import { LOGO_DATA_URI, CERTIFIE_DATA_URI, LOGO_WIDTH, LOGO_HEIGHT, CERTIFIE_WIDTH, CERTIFIE_HEIGHT } from "../_shared/assets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPANY_INFO = {
  name: "Depan.Pro",
  address: "7, place du 11 Novembre 1918",
  city: "93000 Bobigny",
  phone: "01 84 60 86 30",
  email: "contact@depan.pro",
  siren: "992 525 576",
  siret: "992 525 576 00011",
  tva: "FR41 992 525 576",
};

const BRAND_GREEN: [number, number, number] = [15, 184, 127];

const CATEGORY_LABELS: Record<string, string> = {
  locksmith: "Serrurerie",
  plumbing: "Plomberie",
  electricity: "Électricité",
  glazing: "Vitrerie",
  heating: "Chauffage",
  aircon: "Climatisation",
};

function formatDateFr(d: Date): string {
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function generateInvoiceNumber(interventionId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const shortId = interventionId.substring(0, 8).toUpperCase();
  return `${year}${month}-${shortId}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interventionId } = await req.json();
    if (!interventionId || typeof interventionId !== "string") {
      return new Response(JSON.stringify({ error: "interventionId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch intervention
    const { data: intervention, error: intErr } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();
    if (intErr || !intervention) throw new Error("Intervention not found");

    // Quote lines
    const { data: quoteLinesRaw } = await supabase
      .from("intervention_quotes")
      .select("*")
      .eq("intervention_id", interventionId)
      .order("display_order", { ascending: true });
    const quoteLines = quoteLinesRaw || [];

    // Approved modifications + items
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

    // Technician
    let technicianName = "Non assigné";
    if (intervention.technician_id) {
      const { data: tech } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", intervention.technician_id)
        .single();
      if (tech) technicianName = `${tech.first_name} ${tech.last_name}`;
    }

    // Client
    let accountFirstName: string | null = null;
    let accountLastName: string | null = null;
    let isCompany = false;
    let companyName: string | null = null;
    let clientAddress: string | null = null;
    let siren: string | null = null;
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
        clientAddress = client.company_address;
        siren = client.siren;
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
        .select("contact_firstname, contact_lastname, construction_company")
        .eq("id", intervention.b2b_partner_id)
        .single();
      if (partner) {
        b2bContactFirstName = partner.contact_firstname;
        b2bContactLastName = partner.contact_lastname;
        constructionCompany = partner.construction_company === true;
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

    // VAT rate from service
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

    // Totals
    const baseTotal = quoteLines.reduce((s: number, l: any) => s + Number(l.calculated_price), 0);
    const additionalTotal = mods.reduce((s: number, m: any) => s + Number(m.total_additional_amount), 0);
    const totalHT = baseTotal + additionalTotal;
    // B2B « entreprise de construction » → autoliquidation de TVA (art. 283-2 nonies du CGI).
    const vatExempt = constructionCompany;
    if (vatExempt) vatRate = 0;
    const tva = vatExempt ? 0 : totalHT * (vatRate / 100);
    const totalTTC = totalHT + tva;

    const invoiceDate = intervention.invoice_signed_at ? new Date(intervention.invoice_signed_at) : new Date();
    console.log("invoiceDate", invoiceDate);
    console.log("IID", interventionId);
    const invoiceNumber = generateInvoiceNumber(interventionId, invoiceDate);

    // Build PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = BRAND_GREEN;
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];

    let yPos = 20;

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 8, "F");

    // Logo (remplace le titre texte « Depan.Pro »)
    doc.addImage(LOGO_DATA_URI, "PNG", 20, 13.33, LOGO_WIDTH, LOGO_HEIGHT);

    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "normal");
    yPos = 36;
    doc.text(COMPANY_INFO.address, 20, yPos);
    yPos += 5;
    doc.text(COMPANY_INFO.city, 20, yPos);
    yPos += 5;
    doc.text(`Tél: ${COMPANY_INFO.phone}`, 20, yPos);
    yPos += 5;
    doc.text(`Email: ${COMPANY_INFO.email}`, 20, yPos);
    yPos += 5;
    doc.text(`SIREN: ${COMPANY_INFO.siren}`, 20, yPos);
    yPos += 5;
    doc.text(`SIRET: ${COMPANY_INFO.siret}`, 20, yPos);
    yPos += 5;
    doc.text(`N° TVA: ${COMPANY_INFO.tva}`, 20, yPos);

    doc.setFontSize(28);
    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", pageWidth - 20, 28, { align: "right" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${invoiceNumber}`, pageWidth - 20, 38, { align: "right" });
    doc.text(`Date: ${formatDateFr(invoiceDate)}`, pageWidth - 20, 45, { align: "right" });

    yPos = 72;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos = 77;
    const clientBoxHeight = isCompany ? 50 : 40;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(pageWidth - 95, yPos, 75, clientBoxHeight, 3, 3, "F");

    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURER À", pageWidth - 90, yPos + 8);

    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "normal");

    let cY = yPos + 16;
    if (isCompany && companyName) {
      doc.setFont("helvetica", "bold");
      doc.text(companyName, pageWidth - 90, cY);
      cY += 6;
      doc.setFont("helvetica", "normal");
    }
    doc.text(clientName, pageWidth - 90, cY);
    cY += 6;
    if (clientEmail) {
      doc.text(clientEmail, pageWidth - 90, cY);
      cY += 6;
    }
    if (clientPhone) {
      doc.text(clientPhone, pageWidth - 90, cY);
      cY += 6;
    }
    if (isCompany && siren) doc.text(`SIREN: ${siren}`, pageWidth - 90, cY);

    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("INTERVENTION", 20, yPos + 8);

    doc.setTextColor(...textDark);
    doc.setFont("helvetica", "normal");
    doc.text(intervention.title || "", 20, yPos + 16);
    doc.setTextColor(...textMuted);
    doc.text(`${intervention.address || ""}`, 20, yPos + 22);
    doc.text(`${intervention.postal_code || ""} ${intervention.city || ""}`, 20, yPos + 28);
    doc.text(`Catégorie: ${CATEGORY_LABELS[intervention.category] || intervention.category}`, 20, yPos + 34);
    doc.text(`Technicien: ${technicianName}`, 20, yPos + 40);
    if (intervention.tracking_code) doc.text(`Réf: ${intervention.tracking_code}`, 20, yPos + 46);

    yPos = 128;

    const tableData: (string | number)[][] = [];
    quoteLines.forEach((line: any) => {
      tableData.push([
        line.label,
        "Devis initial",
        `${Number(line.base_price).toFixed(2)} €`,
        `×${line.multiplier}`,
        `${Number(line.calculated_price).toFixed(2)} €`,
      ]);
    });
    mods.forEach((mod: any) => {
      const items = modItems.filter((it) => it.modification_id === mod.id);
      items.forEach((item: any) => {
        tableData.push([
          item.label,
          "Supplément approuvé",
          `${Number(item.unit_price).toFixed(2)} €`,
          `×${item.quantity}`,
          `${Number(item.total_price).toFixed(2)} €`,
        ]);
      });
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Description", "Type", "Prix unitaire", "Qté/Coef.", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: textDark },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 20, right: 20 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
    yPos = finalY + 15;

    const totalsBoxWidth = 80;
    const totalsBoxX = pageWidth - 20 - totalsBoxWidth;

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(totalsBoxX, yPos, totalsBoxWidth, vatExempt ? 30 : 45, 3, 3, "F");

    if (vatExempt) {
      doc.setFontSize(12);
      doc.setTextColor(...textDark);
      doc.setFont("helvetica", "bold");
      doc.text("Total HT:", totalsBoxX + 5, yPos + 18);
      doc.setTextColor(...primaryColor);
      doc.text(`${totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 18, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text(
        "TVA non applicable — autoliquidation par le preneur (art. 283-2 nonies du CGI).",
        totalsBoxX,
        yPos + 37,
        { maxWidth: totalsBoxWidth },
      );
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text("Sous-total HT:", totalsBoxX + 5, yPos + 10);
      doc.text(`${totalHT.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 10, { align: "right" });
      doc.text(`TVA (${vatRate}%):`, totalsBoxX + 5, yPos + 20);
      doc.text(`${tva.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 20, { align: "right" });

      doc.setDrawColor(200, 200, 200);
      doc.line(totalsBoxX + 5, yPos + 26, totalsBoxX + totalsBoxWidth - 5, yPos + 26);

      doc.setFontSize(12);
      doc.setTextColor(...textDark);
      doc.setFont("helvetica", "bold");
      doc.text("Total TTC:", totalsBoxX + 5, yPos + 38);
      doc.setTextColor(...primaryColor);
      doc.text(`${totalTTC.toFixed(2)} €`, totalsBoxX + totalsBoxWidth - 5, yPos + 38, { align: "right" });
    }

    // Signature section
    // Signature « certifiée » — au même niveau que le bloc totaux (colonne de gauche)
    const signatureData: string | null = intervention.invoice_signature_data || null;
    const sigTop = yPos;
    if (signatureData) {
      try {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...textDark);
        const at = intervention.invoice_signed_at ? new Date(intervention.invoice_signed_at) : null;
        const label = at ? ` le ${String(at.getDate()).padStart(2, "0")}/${String(at.getMonth() + 1).padStart(2, "0")}/${at.getFullYear()} ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` : "";
        const signText = `Signé électroniquement${label}`;
        doc.text(signText, 20, sigTop + 10);
        const signCenterX = 20 + doc.getTextWidth(signText) / 2;
        const badgeX = Math.min(Math.max(signCenterX - CERTIFIE_WIDTH / 2, 20), totalsBoxX - CERTIFIE_WIDTH - 2);
        doc.addImage(CERTIFIE_DATA_URI, "JPEG", badgeX, sigTop + 16, CERTIFIE_WIDTH, CERTIFIE_HEIGHT);
        if (intervention.invoice_signature_id) {
          doc.setFontSize(8);
          doc.setTextColor(...textMuted);
          doc.text(`Réf. signature : ${intervention.invoice_signature_id}`, badgeX + CERTIFIE_WIDTH / 2, sigTop + 16 + CERTIFIE_HEIGHT + 4, { align: "center" });
        }
      } catch (err) {
        console.error("Error adding certified badge to PDF:", err);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, sigTop, 80, 35, 2, 2, "FD");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...textMuted);
      doc.text("En attente de signature", 60, sigTop + 20, { align: "center" });
    }

    // Sous le bloc le plus bas (signature vs totaux)
    yPos = sigTop + 16 + CERTIFIE_HEIGHT + 14;
    // Pas de badge « PAYÉE » pour le B2B : facturation mensuelle, payée plus tard.
    const isB2b = intervention.b2b_partner_id != null || intervention.billing_type === "b2b";
    if (!isB2b) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(20, yPos, pageWidth - 40, 20, 3, 3, "F");
      doc.setFontSize(11);
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
      doc.text("PAYÉE", pageWidth / 2, yPos + 13, { align: "center" });
    }

    const footerY = doc.internal.pageSize.getHeight() - 26.03;
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Merci pour votre confiance ! Pour toute question, contactez-nous à ${COMPANY_INFO.email}`,
      pageWidth / 2,
      footerY,
      { align: "center" },
    );
    doc.text(
      `${COMPANY_INFO.name} - SIRET ${COMPANY_INFO.siret} - N° TVA ${COMPANY_INFO.tva}`,
      pageWidth / 2,
      footerY + 6,
      { align: "center" },
    );

    const dataUri = doc.output("datauristring");
    const invoiceBase64 = dataUri.split(",")[1];
    const invoiceFileName = `facture-${invoiceNumber}.pdf`;

    return new Response(JSON.stringify({ success: true, invoiceBase64, invoiceFileName, invoiceNumber }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("create-invoice error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
