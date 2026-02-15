import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';

const CGUPage = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Conditions Générales d'Utilisation</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Objet</h2>
            <p>Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions d'utilisation des services proposés par Dépan.Pro (ci-après « le Service »), ainsi que de définir les droits et obligations des parties dans ce cadre.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Acceptation des CGU</h2>
            <p>L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Description du Service</h2>
            <p>Dépan.Pro est une plateforme de mise en relation entre des particuliers ou professionnels ayant besoin d'un dépannage d'urgence (serrurerie, plomberie, électricité, vitrerie, chauffage, climatisation) et des techniciens partenaires qualifiés.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Inscription et compte utilisateur</h2>
            <p>Pour utiliser certaines fonctionnalités du Service, l'utilisateur doit créer un compte en fournissant des informations exactes et à jour. L'utilisateur est responsable de la confidentialité de ses identifiants de connexion et de toute activité réalisée sous son compte.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Obligations de l'utilisateur</h2>
            <p>L'utilisateur s'engage à :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Utiliser le Service conformément à sa destination et aux présentes CGU</li>
              <li>Fournir des informations exactes et complètes</li>
              <li>Ne pas porter atteinte aux droits des tiers</li>
              <li>Ne pas perturber le fonctionnement du Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Responsabilité</h2>
            <p>Dépan.Pro agit en qualité d'intermédiaire entre les clients et les techniciens. La responsabilité de Dépan.Pro ne saurait être engagée en cas de litige entre un client et un technicien concernant la qualité ou l'exécution de la prestation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Tarification</h2>
            <p>Les tarifs des interventions sont communiqués avant toute validation. Un devis détaillé est soumis au client pour approbation avant le début de chaque intervention. Le paiement est autorisé avant l'intervention et capturé après sa réalisation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Propriété intellectuelle</h2>
            <p>L'ensemble des contenus du site (textes, images, logos, etc.) sont la propriété exclusive de Dépan.Pro et sont protégés par les lois relatives à la propriété intellectuelle. Toute reproduction est strictement interdite sans autorisation préalable.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Modification des CGU</h2>
            <p>Dépan.Pro se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification. L'utilisation continue du Service après modification vaut acceptation des nouvelles CGU.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Droit applicable</h2>
            <p>Les présentes CGU sont soumises au droit français. Tout litige sera de la compétence exclusive des tribunaux français.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CGUPage;
