import { ClipboardList, MapPin, FileText, Wrench } from 'lucide-react';

const steps = [
  {
    icon: ClipboardList,
    step: 1,
    title: 'Faire une demande',
    description: 'Décrivez votre problème en quelques clics, en ligne ou par téléphone.',
  },
  {
    icon: MapPin,
    step: 2,
    title: 'Un technicien proche',
    description: 'Un artisan qualifié près de chez vous est immédiatement alerté.',
  },
  {
    icon: FileText,
    step: 3,
    title: 'Devis simple',
    description: 'Recevez un devis clair et transparent avant toute intervention.',
  },
  {
    icon: Wrench,
    step: 4,
    title: 'Intervention rapide',
    description: 'Votre problème est résolu rapidement par un professionnel certifié.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Comment ça marche ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Une intervention en 4 étapes simples
          </p>
        </div>
        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-border lg:block" />
          
          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((item, index) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <item.icon className="h-8 w-8" />
                </div>
                {/* Step number badge */}
                <div className="absolute -top-2 left-1/2 z-20 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
