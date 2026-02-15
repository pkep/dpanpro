import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';

const PrivacyPolicyPage = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>Dépan.Pro s'engage à protéger la vie privée de ses utilisateurs. La présente politique de confidentialité décrit les informations que nous collectons, comment nous les utilisons et les mesures que nous prenons pour les protéger.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
              <li><strong>Données de localisation :</strong> adresse d'intervention, coordonnées GPS</li>
              <li><strong>Données de paiement :</strong> traitées de manière sécurisée via notre prestataire de paiement Stripe</li>
              <li><strong>Données d'utilisation :</strong> historique des interventions, évaluations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Finalité du traitement</h2>
            <p>Les données collectées sont utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>La gestion de votre compte utilisateur</li>
              <li>La mise en relation avec les techniciens</li>
              <li>Le traitement des paiements</li>
              <li>L'amélioration de nos services</li>
              <li>La communication relative à vos interventions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Base légale du traitement</h2>
            <p>Le traitement de vos données repose sur l'exécution du contrat qui nous lie (CGU), votre consentement, et nos intérêts légitimes dans le cadre de l'amélioration de nos services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Durée de conservation</h2>
            <p>Vos données sont conservées pendant la durée nécessaire à la finalité du traitement, et au maximum pendant une durée de 3 ans après votre dernière activité sur la plateforme, sauf obligations légales contraires.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Partage des données</h2>
            <p>Vos données peuvent être partagées avec les techniciens partenaires dans le cadre des interventions, ainsi qu'avec nos prestataires techniques (hébergement, paiement). Nous ne vendons jamais vos données à des tiers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition au traitement</li>
              <li>Droit à la limitation du traitement</li>
            </ul>
            <p>Pour exercer ces droits, contactez-nous à : contact@depan-pro.com</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
