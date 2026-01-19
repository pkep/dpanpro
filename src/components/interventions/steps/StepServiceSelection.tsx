import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { servicesService } from '@/services/services/services.service';
import { CATEGORY_ICONS, CATEGORY_LABELS, InterventionCategory } from '@/types/intervention.types';
import { Loader2, Wrench, Key, Zap, Flame, Snowflake, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepServiceSelectionProps {
  selectedCategory: InterventionCategory | null;
  onSelect: (category: InterventionCategory) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  locksmith: <Key className="h-8 w-8" />,
  plumbing: <Wrench className="h-8 w-8" />,
  electricity: <Zap className="h-8 w-8" />,
  glazing: <Grid3X3 className="h-8 w-8" />,
  heating: <Flame className="h-8 w-8" />,
  aircon: <Snowflake className="h-8 w-8" />,
};

export function StepServiceSelection({ selectedCategory, onSelect }: StepServiceSelectionProps) {
  const [services, setServices] = useState<Array<{ code: string; name: string; description: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const activeServices = await servicesService.getActiveServices();
        setServices(activeServices);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadServices();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Quel type d'intervention ?</h2>
        <p className="text-muted-foreground mt-2">
          Sélectionnez le service dont vous avez besoin
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {services.map((service) => {
          const category = service.code as InterventionCategory;
          const isSelected = selectedCategory === category;
          
          return (
            <Card
              key={service.code}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                isSelected && 'border-primary ring-2 ring-primary/20 bg-primary/5'
              )}
              onClick={() => onSelect(category)}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className={cn(
                  'mb-3 text-muted-foreground',
                  isSelected && 'text-primary'
                )}>
                  {categoryIcons[service.code] || <Wrench className="h-8 w-8" />}
                </div>
                <h3 className="font-semibold">{service.name}</h3>
                {service.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {service.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
