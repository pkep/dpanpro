import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, ArrowRight } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export function HeroSection() {
  const { phoneNumber } = useSiteSettings();
  const phoneLink = phoneNumber.replace(/\s/g, '');

  return (
    <section className="relative overflow-hidden bg-secondary py-20 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary/20" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-secondary-foreground sm:text-5xl lg:text-6xl">
            Dépannage urgent 24h/24
            <span className="block text-primary">partout en France</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-secondary-foreground/80">
            Serrurerie, plomberie, électricité... Nos artisans certifiés interviennent 
            en moins de 30 minutes pour résoudre tous vos problèmes du quotidien.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link to="/new-intervention">
                Demander une intervention
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 text-lg">
              <a href={`tel:${phoneLink}`}>
                <Phone className="mr-2 h-5 w-5" />
                {phoneNumber || '0 800 123 456'}
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-secondary-foreground/60">
            Appel gratuit • Disponible 24h/24 et 7j/7
          </p>
        </div>
      </div>
    </section>
  );
}
