import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportService } from '@/services/export/export.service';
import type { Intervention } from '@/types/intervention.types';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  interventions: Intervention[];
  disabled?: boolean;
}

export function ExportButton({ interventions, disabled }: ExportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');
  const [includeStats, setIncludeStats] = useState(true);
  const [useDateRange, setUseDateRange] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: undefined,
    end: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = (type: 'pdf' | 'excel') => {
    setExportType(type);
    setShowDialog(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Filter by date range if enabled
      let filteredInterventions = interventions;
      if (useDateRange && dateRange.start && dateRange.end) {
        filteredInterventions = interventions.filter((i) => {
          const createdAt = new Date(i.createdAt);
          return createdAt >= dateRange.start! && createdAt <= dateRange.end!;
        });
      }

      if (filteredInterventions.length === 0) {
        toast.error('Aucune intervention à exporter pour cette période');
        return;
      }

      const options = {
        title: 'Rapport des Interventions',
        includeStatistics: includeStats,
        dateRange: useDateRange && dateRange.start && dateRange.end 
          ? { start: dateRange.start, end: dateRange.end }
          : undefined,
      };

      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (exportType === 'pdf') {
        exportService.exportToPDF(filteredInterventions, options);
      } else {
        exportService.exportToExcel(filteredInterventions, options);
      }

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Export {exportType.toUpperCase()} téléchargé avec succès</span>
        </div>
      );
      setShowDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled || interventions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExportClick('pdf')}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            Export PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportClick('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Export Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportType === 'pdf' ? (
                <FileText className="h-5 w-5 text-red-500" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              )}
              Export {exportType.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Configurez les options d'export pour {interventions.length} intervention(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Include Statistics */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-stats">Inclure les statistiques</Label>
                <p className="text-xs text-muted-foreground">
                  Ajoute un résumé avec graphiques
                </p>
              </div>
              <Switch
                id="include-stats"
                checked={includeStats}
                onCheckedChange={setIncludeStats}
              />
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="use-date-range">Filtrer par période</Label>
                  <p className="text-xs text-muted-foreground">
                    Exporter une période spécifique
                  </p>
                </div>
                <Switch
                  id="use-date-range"
                  checked={useDateRange}
                  onCheckedChange={setUseDateRange}
                />
              </div>

              {useDateRange && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Date début</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal text-xs',
                            !dateRange.start && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateRange.start ? (
                            format(dateRange.start, 'dd/MM/yy')
                          ) : (
                            'Début'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.start}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, start: date }))}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">Date fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal text-xs',
                            !dateRange.end && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateRange.end ? (
                            format(dateRange.end, 'dd/MM/yy')
                          ) : (
                            'Fin'
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.end}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, end: date }))}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
