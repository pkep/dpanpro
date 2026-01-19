import { Clock, ThumbsUp, Timer, Users } from 'lucide-react';

const figures = [
  {
    icon: Clock,
    value: '24h/7j',
    label: 'Disponibilité',
    description: 'Service disponible jour et nuit',
  },
  {
    icon: ThumbsUp,
    value: '98%',
    label: 'Satisfaction client',
    description: 'Clients satisfaits de nos services',
  },
  {
    icon: Timer,
    value: '30 min',
    label: 'Temps de réponse',
    description: 'Intervention rapide garantie',
  },
  {
    icon: Users,
    value: '500+',
    label: 'Artisans certifiés',
    description: 'Professionnels qualifiés',
  },
];

export function KeyFigures() {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {figures.map((figure) => (
            <div
              key={figure.label}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <figure.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{figure.value}</div>
              <div className="text-lg font-medium text-foreground">{figure.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{figure.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
