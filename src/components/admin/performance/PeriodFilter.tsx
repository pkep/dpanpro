import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodFilterProps {
  onPeriodChange: (period: PeriodType, dateRange: DateRange) => void;
  defaultPeriod?: PeriodType;
}

export function getDateRangeForPeriod(period: PeriodType, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();
  switch (period) {
    case 'daily':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'weekly':
      return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'monthly':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'yearly':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    case 'custom':
      return {
        startDate: customStart || startOfMonth(now),
        endDate: customEnd || endOfDay(now),
      };
  }
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  yearly: 'Annuel',
  custom: 'Personnalisé',
};

export function PeriodFilter({ onPeriodChange, defaultPeriod = 'monthly' }: PeriodFilterProps) {
  const [period, setPeriod] = useState<PeriodType>(defaultPeriod);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const handlePeriodChange = (value: string) => {
    const newPeriod = value as PeriodType;
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      onPeriodChange(newPeriod, getDateRangeForPeriod(newPeriod));
    }
  };

  const handleApplyCustom = () => {
    if (customStartDate && customEndDate) {
      const range = getDateRangeForPeriod('custom', startOfDay(customStartDate), endOfDay(customEndDate));
      onPeriodChange('custom', range);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Début'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Fin'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                disabled={(date) => customStartDate ? date < customStartDate : false}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <Button size="sm" onClick={handleApplyCustom} disabled={!customStartDate || !customEndDate}>
            Appliquer
          </Button>
        </>
      )}
    </div>
  );
}
