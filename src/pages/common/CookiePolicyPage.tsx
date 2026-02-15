import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';

const CookiePolicyPage = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Politique de Cookies</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Qu'est-ce qu'un cookie ?</h2>
            <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite, comme votre langue préférée et d'autres paramètres.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Cookies utilisés</h2>
            <p>Nous utilisons les catégories de cookies suivantes :</p>

            <h3 className="text-lg font-medium text-foreground mt-4">Cookies strictement nécessaires</h3>
            <p>Ces cookies sont indispensables au fonctionnement du site. Ils permettent l'authentification, la navigation et la sécurité de votre session.</p>

            <h3 className="text-lg font-medium text-foreground mt-4">Cookies fonctionnels</h3>
            <p>Ces cookies permettent de mémoriser vos préférences (langue, thème) afin d'améliorer votre expérience utilisateur.</p>

            <h3 className="text-lg font-medium text-foreground mt-4">Cookies analytiques</h3>
            <p>Ces cookies nous aident à comprendre comment les visiteurs interagissent avec le site en collectant des données de manière anonyme. Ils nous permettent d'améliorer le fonctionnement du site.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Durée de conservation</h2>
            <p>Les cookies de session sont supprimés lorsque vous fermez votre navigateur. Les cookies persistants ont une durée de vie maximale de 13 mois conformément aux recommandations de la CNIL.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Gestion des cookies</h2>
            <p>Vous pouvez à tout moment gérer vos préférences en matière de cookies :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Via votre navigateur :</strong> chaque navigateur propose des options pour accepter, refuser ou supprimer les cookies</li>
              <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
              <li><strong>Firefox :</strong> Options → Vie privée et sécurité → Cookies</li>
              <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies</li>
            </ul>
            <p className="mt-2">Attention : la désactivation de certains cookies peut affecter le bon fonctionnement du site.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Mise à jour</h2>
            <p>Cette politique de cookies peut être mise à jour à tout moment. La date de dernière mise à jour sera indiquée en bas de cette page.</p>
            <p className="mt-4 text-sm">Dernière mise à jour : Février 2026</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicyPage;
