import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { performanceService, type TechnicianPerformance, type PeriodType } from '@/services/performance/performance.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  yearly: 'Annuel',
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export function PerformanceReportsTab() {
  const [period, setPeriod] = useState<PeriodType>('monthly');

  const { data: performances, isLoading } = useQuery({
    queryKey: ['technician-performances', period],
    queryFn: () => performanceService.getTechnicianPerformances(period),
  });

  const exportToPDF = () => {
    if (!performances) return;

    const doc = new jsPDF();
    const title = `Rapport de Performance - ${PERIOD_LABELS[period]}`;
    const currentDate = format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });

    doc.setFontSize(20);
    doc.setTextColor(15, 184, 127);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${currentDate}`, 14, 30);

    const tableData = performances.map((p, index) => [
      (index + 1).toString(),
      `${p.firstName} ${p.lastName}`,
      p.companyName || '-',
      formatCurrency(p.revenue),
      p.completedInterventions.toString(),
      formatDuration(p.avgResponseTimeSeconds),
      formatDuration(p.avgArrivalTimeSeconds),
      p.avgRating ? `${p.avgRating.toFixed(1)}/5` : '-',
      `${p.acceptanceRate.toFixed(0)}%`,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['#', 'Technicien', 'Entreprise', 'CA', 'Interv.', 'Temps rép.', 'Temps arr.', 'Note', 'Accept.']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 184, 127], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 15 },
        8: { cellWidth: 15 },
      },
    });

    doc.save(`rapport-performance-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    if (!performances) return;

    const data = performances.map((p, index) => ({
      '#': index + 1,
      'Technicien': `${p.firstName} ${p.lastName}`,
      'Entreprise': p.companyName || '-',
      'CA Généré (€)': p.revenue,
      'Nb Interventions': p.completedInterventions,
      'Temps Réponse (min)': p.avgResponseTimeSeconds ? Math.round(p.avgResponseTimeSeconds / 60) : '-',
      'Temps Arrivée (min)': p.avgArrivalTimeSeconds ? Math.round(p.avgArrivalTimeSeconds / 60) : '-',
      'Note Moyenne': p.avgRating ? p.avgRating.toFixed(1) : '-',
      'Taux Acceptation (%)': p.acceptanceRate.toFixed(0),
    }));

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    
    sheet['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, 'Performances');
    XLSX.writeFile(workbook, `rapport-performance-${period}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Rapports de Performance</CardTitle>
            <CardDescription>Export PDF/CSV des performances des techniciens</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="yearly">Annuel</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!performances?.length}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!performances?.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : performances && performances.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Technicien</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead className="text-right">CA Généré</TableHead>
                  <TableHead className="text-right">Interventions</TableHead>
                  <TableHead className="text-right">Temps rép.</TableHead>
                  <TableHead className="text-right">Temps arr.</TableHead>
                  <TableHead className="text-right">Satisfaction</TableHead>
                  <TableHead className="text-right">Acceptation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performances.map((p, index) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{p.firstName} {p.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{p.companyName || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right">{p.completedInterventions}</TableCell>
                    <TableCell className="text-right">{formatDuration(p.avgResponseTimeSeconds)}</TableCell>
                    <TableCell className="text-right">{formatDuration(p.avgArrivalTimeSeconds)}</TableCell>
                    <TableCell className="text-right">
                      {p.avgRating ? `${p.avgRating.toFixed(1)}/5` : '-'}
                    </TableCell>
                    <TableCell className="text-right">{p.acceptanceRate.toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible pour cette période
          </p>
        )}
      </CardContent>
    </Card>
  );
}
