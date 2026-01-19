import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, TrendingUp, Calendar, Shield, ArrowRight } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Augmentez vos revenus',
    description: 'Recevez des demandes d\'intervention qualifiées dans votre zone.',
  },
  {
    icon: Calendar,
    title: 'Gérez votre planning',
    description: 'Acceptez les missions qui vous conviennent, quand vous le souhaitez.',
  },
  {
    icon: Shield,
    title: 'Paiements sécurisés',
    description: 'Recevez vos paiements de manière sécurisée et rapide.',
  },
  {
    icon: CheckCircle,
    title: 'Support dédié',
    description: 'Une équipe à votre écoute pour vous accompagner au quotidien.',
  },
];

export function BecomePartner() {
  return (
    <section className="bg-secondary py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-secondary-foreground sm:text-4xl">
              Devenez partenaire DépanPro
            </h2>
            <p className="mt-4 text-lg text-secondary-foreground/80">
              Rejoignez notre réseau d'artisans qualifiés et développez votre activité 
              grâce à notre plateforme de mise en relation.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/join">
                Rejoindre le réseau
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl bg-secondary-foreground/5 p-6 backdrop-blur-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 font-semibold text-secondary-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm text-secondary-foreground/70">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
