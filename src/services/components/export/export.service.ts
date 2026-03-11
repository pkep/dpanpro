import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Intervention } from '@/types/intervention.types';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '@/types/intervention.types';

interface ExportOptions {
  title?: string;
  dateRange?: { start: Date; end: Date };
  includeStatistics?: boolean;
}

interface Statistics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  completedCount: number;
  averageCompletionTime?: number;
  totalRevenue?: number;
}

function calculateStatistics(interventions: Intervention[]): Statistics {
  const stats: Statistics = {
    total: interventions.length,
    byStatus: {},
    byCategory: {},
    byPriority: {},
    completedCount: 0,
    totalRevenue: 0,
  };

  let totalCompletionTime = 0;
  let completedWithTime = 0;

  interventions.forEach((intervention) => {
    // Count by status
    const status = intervention.status;
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Count by category
    const category = intervention.category;
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    // Count by priority
    const priority = intervention.priority;
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

    // Count completed
    if (status === 'completed') {
      stats.completedCount++;
      if (intervention.finalPrice) {
        stats.totalRevenue = (stats.totalRevenue || 0) + intervention.finalPrice;
      }

      // Calculate completion time
      if (intervention.completedAt && intervention.createdAt) {
        const completionTime = new Date(intervention.completedAt).getTime() - new Date(intervention.createdAt).getTime();
        totalCompletionTime += completionTime;
        completedWithTime++;
      }
    }
  });

  if (completedWithTime > 0) {
    stats.averageCompletionTime = totalCompletionTime / completedWithTime / (1000 * 60 * 60); // In hours
  }

  return stats;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
}

export function exportToPDF(interventions: Intervention[], options: ExportOptions = {}): void {
  const doc = new jsPDF();
  const stats = options.includeStatistics !== false ? calculateStatistics(interventions) : null;
  const title = options.title || 'Rapport des Interventions';
  const currentDate = format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });

  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(41, 98, 255);
  doc.text(title, 14, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Généré le ${currentDate}`, 14, yPos);
  yPos += 5;

  if (options.dateRange) {
    doc.text(
      `Période: ${format(options.dateRange.start, 'dd/MM/yyyy')} - ${format(options.dateRange.end, 'dd/MM/yyyy')}`,
      14,
      yPos
    );
    yPos += 5;
  }

  doc.text(`Total: ${interventions.length} intervention(s)`, 14, yPos);
  yPos += 10;

  // Statistics section
  if (stats) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Statistiques', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(60);

    // Stats grid
    const statsData = [
      ['Total interventions', stats.total.toString()],
      ['Terminées', stats.completedCount.toString()],
      ['Taux de complétion', `${stats.total > 0 ? ((stats.completedCount / stats.total) * 100).toFixed(1) : 0}%`],
      ['Temps moyen (heures)', stats.averageCompletionTime ? stats.averageCompletionTime.toFixed(1) : '-'],
      ['Revenu total', formatPrice(stats.totalRevenue)],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Métrique', 'Valeur']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: 14, right: 14 },
      tableWidth: 80,
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Status breakdown
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Par statut', 14, yPos);
    yPos += 5;

    const statusData = Object.entries(stats.byStatus).map(([status, count]) => [
      STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
      count.toString(),
      `${((count / stats.total) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Statut', 'Nombre', 'Pourcentage']],
      body: statusData,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] },
      margin: { left: 14, right: 14 },
      tableWidth: 100,
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Category breakdown
    doc.text('Par catégorie', 14, yPos);
    yPos += 5;

    const categoryData = Object.entries(stats.byCategory).map(([category, count]) => [
      CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
      count.toString(),
      `${((count / stats.total) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Catégorie', 'Nombre', 'Pourcentage']],
      body: categoryData,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] },
      margin: { left: 14, right: 14 },
      tableWidth: 100,
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page for the detailed table
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  // Detailed interventions table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Détail des interventions', 14, yPos);
  yPos += 8;

  const tableData = interventions.map((i) => [
    i.title.substring(0, 25) + (i.title.length > 25 ? '...' : ''),
    CATEGORY_LABELS[i.category] || i.category,
    STATUS_LABELS[i.status] || i.status,
    PRIORITY_LABELS[i.priority] || i.priority,
    `${i.city}`,
    formatDate(i.createdAt),
    formatPrice(i.finalPrice || i.estimatedPrice),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Titre', 'Catégorie', 'Statut', 'Priorité', 'Ville', 'Créée le', 'Prix']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 98, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 18 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 },
      6: { cellWidth: 22 },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `rapport-interventions-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}

export function exportToExcel(interventions: Intervention[], options: ExportOptions = {}): void {
  const stats = options.includeStatistics !== false ? calculateStatistics(interventions) : null;
  const workbook = XLSX.utils.book_new();

  // Main data sheet
  const mainData = interventions.map((i) => ({
    'ID': i.id,
    'Titre': i.title,
    'Description': i.description || '',
    'Catégorie': CATEGORY_LABELS[i.category] || i.category,
    'Statut': STATUS_LABELS[i.status] || i.status,
    'Priorité': PRIORITY_LABELS[i.priority] || i.priority,
    'Adresse': i.address,
    'Code Postal': i.postalCode,
    'Ville': i.city,
    'Créée le': formatDate(i.createdAt),
    'Planifiée le': formatDate(i.scheduledAt),
    'Démarrée le': formatDate(i.startedAt),
    'Terminée le': formatDate(i.completedAt),
    'Prix estimé': i.estimatedPrice || '',
    'Prix final': i.finalPrice || '',
    'Active': i.isActive ? 'Oui' : 'Non',
  }));

  const mainSheet = XLSX.utils.json_to_sheet(mainData);
  
  // Set column widths
  mainSheet['!cols'] = [
    { wch: 36 }, // ID
    { wch: 30 }, // Titre
    { wch: 40 }, // Description
    { wch: 15 }, // Catégorie
    { wch: 12 }, // Statut
    { wch: 10 }, // Priorité
    { wch: 30 }, // Adresse
    { wch: 10 }, // Code Postal
    { wch: 15 }, // Ville
    { wch: 18 }, // Créée le
    { wch: 18 }, // Planifiée le
    { wch: 18 }, // Démarrée le
    { wch: 18 }, // Terminée le
    { wch: 12 }, // Prix estimé
    { wch: 12 }, // Prix final
    { wch: 8 },  // Active
  ];

  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Interventions');

  // Statistics sheet
  if (stats) {
    const statsData = [
      ['STATISTIQUES GÉNÉRALES', ''],
      ['', ''],
      ['Total interventions', stats.total],
      ['Interventions terminées', stats.completedCount],
      ['Taux de complétion', `${stats.total > 0 ? ((stats.completedCount / stats.total) * 100).toFixed(1) : 0}%`],
      ['Temps moyen de traitement (heures)', stats.averageCompletionTime ? stats.averageCompletionTime.toFixed(1) : '-'],
      ['Revenu total', stats.totalRevenue || 0],
      ['', ''],
      ['PAR STATUT', ''],
      ...Object.entries(stats.byStatus).map(([status, count]) => [
        STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
        count,
      ]),
      ['', ''],
      ['PAR CATÉGORIE', ''],
      ...Object.entries(stats.byCategory).map(([category, count]) => [
        CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
        count,
      ]),
      ['', ''],
      ['PAR PRIORITÉ', ''],
      ...Object.entries(stats.byPriority).map(([priority, count]) => [
        PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || priority,
        count,
      ]),
    ];

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    statsSheet['!cols'] = [{ wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiques');
  }

  // Save the Excel file
  const fileName = `rapport-interventions-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export const exportService = {
  exportToPDF,
  exportToExcel,
};
