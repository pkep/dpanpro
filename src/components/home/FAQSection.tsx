import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqItems: { question: string; answer: string; link?: string }[] = [
  {
    question: "Quels sont vos délais d'intervention ?",
    answer: "Nous intervenons généralement sous 30 à 60 minutes pour les urgences. Pour les interventions programmées, nous fixons un créneau qui vous convient."
  },
  {
    question: "Comment sont calculés vos tarifs ?",
    answer: "Nos tarifs comprennent le déplacement, la mise en sécurité et le dépannage. Un devis détaillé vous est fourni avant toute intervention, sans frais cachés.",
    link: "/comprendre-nos-tarifs"
  },
  {
    question: "Intervenez-vous 24h/24 ?",
    answer: "Oui, notre service est disponible 24h/24 et 7j/7, y compris les jours fériés, pour répondre à toutes vos urgences."
  },
  {
    question: "Quels modes de paiement acceptez-vous ?",
    answer: "Nous acceptons les paiements par carte bancaire directement sur notre plateforme. Le paiement est sécurisé et vous recevez une facture détaillée."
  },
  {
    question: "Vos techniciens sont-ils qualifiés ?",
    answer: "Tous nos techniciens partenaires sont des professionnels certifiés, assurés et expérimentés dans leur domaine. Ils sont rigoureusement sélectionnés."
  },
  {
    question: "Comment suivre l'arrivée du technicien ?",
    answer: "Une fois votre demande validée, vous recevez un code de suivi qui vous permet de suivre en temps réel la position du technicien sur une carte."
  }
];

export function FAQSection() {
  return (
    <section className="bg-muted/50 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-foreground">
            Questions fréquentes
          </h2>
          <p className="mb-8 text-center text-muted-foreground">
            Retrouvez les réponses aux questions les plus courantes
          </p>
          
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                  {item.link && (
                    <Link to={item.link} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                      En savoir plus →
                    </Link>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
