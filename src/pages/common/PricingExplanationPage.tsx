import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Droplets, Zap, GlassWater, Flame, Wind, Info, CheckCircle, PlusCircle } from 'lucide-react';

const serviceDetails = [
  {
    name: 'Serrurerie',
    icon: Lock,
    included: ['Porte claquée', 'Effraction'],
    description: 'Ouverture de porte et mise en sécurité suite à une effraction.',
  },
  {
    name: 'Plomberie urgente',
    icon: Droplets,
    included: ["Fuite d'eau", 'Canalisation bouchée'],
    description: "Intervention rapide pour stopper une fuite ou déboucher une canalisation.",
  },
  {
    name: 'Électricité',
    icon: Zap,
    included: ['Panne électrique', 'Court-circuit'],
    description: 'Diagnostic et remise en service de votre installation électrique.',
  },
  {
    name: 'Vitrerie',
    icon: GlassWater,
    included: ['Bris de glace'],
    description: 'Mise en sécurité et remplacement de vitrage cassé.',
  },
  {
    name: 'Chauffage',
    icon: Flame,
    included: ['Panne de chaudière'],
    description: 'Diagnostic et dépannage de votre système de chauffage.',
  },
  {
    name: 'Climatisation',
    icon: Wind,
    included: ['Dysfonctionnement'],
    description: 'Diagnostic et remise en état de votre climatisation.',
  },
];

const PricingExplanationPage = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary/5 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-foreground">Comprendre nos tarifs</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Nos tarifs sont transparents et sans surprise. Découvrez ce qui est inclus dans chaque intervention de base.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 rounded-lg border border-primary/20 bg-primary/5 p-6">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Comment fonctionne notre tarification ?</h2>
                    <p className="mt-2 text-muted-foreground">
                      Chaque service dispose d'un <strong>tarif de base</strong> qui couvre le déplacement, la mise en sécurité et le dépannage standard. 
                      Ce tarif est appliqué automatiquement lors de votre demande d'intervention.
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      Si des <strong>prestations complémentaires</strong> sont nécessaires (remplacement de pièces, travaux supplémentaires…), 
                      le technicien les ajoutera au devis sur place. Vous devrez approuver et signer le devis mis à jour avant toute intervention complémentaire.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="mb-6 text-2xl font-bold text-foreground">Ce qui est inclus par service</h2>

              <div className="grid gap-6 md:grid-cols-2">
                {serviceDetails.map((service) => (
                  <Card key={service.name}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <service.icon className="h-5 w-5 text-primary" />
                        {service.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2 text-sm font-medium text-foreground">Inclus dans le tarif de base :</p>
                      <ul className="space-y-1.5">
                        {service.included.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Supplements */}
              <div className="mt-10 rounded-lg border border-border bg-muted/30 p-6">
                <div className="flex items-start gap-3">
                  <PlusCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Prestations complémentaires</h3>
                    <p className="mt-2 text-muted-foreground">
                      Au-delà des prestations de base, le technicien peut être amené à proposer des prestations complémentaires 
                      (fourniture et pose de matériel, travaux additionnels, etc.). Ces prestations seront ajoutées au devis 
                      et soumises à votre approbation <strong>avant</strong> toute réalisation. Vous gardez le contrôle total sur le budget final.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PricingExplanationPage;
