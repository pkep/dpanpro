import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { servicesService, type Service } from '@/services/services/services.service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Key, Droplets, Zap, Square, Flame, Wind } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  locksmith: Key,
  plumbing: Droplets,
  electricity: Zap,
  glazing: Square,
  heating: Flame,
  aircon: Wind,
};

export function ServicesSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await servicesService.getActiveServices();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <Skeleton className="mx-auto h-10 w-64" />
            <Skeleton className="mx-auto mt-4 h-6 w-96" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Nos services de dépannage
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Des professionnels qualifiés pour tous vos besoins d'urgence
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const IconComponent = iconMap[service.code] || Key;
            return (
              <div
                key={service.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/50"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <IconComponent className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {service.name}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {service.description}
                </p>
                <Button asChild variant="link" className="p-0 text-primary">
                  <Link to={`/new-intervention?service=${service.code}`}>
                    Demander un dépannage
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
