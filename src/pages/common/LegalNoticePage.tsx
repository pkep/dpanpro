import { Header } from '@/components/home/Header';
import { Footer } from '@/components/home/Footer';

const LegalNoticePage = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Mentions Légales</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Éditeur du site</h2>
            <p>Le site Dépan.Pro est édité par :</p>
            <ul className="list-none space-y-1">
              <li><strong>Raison sociale :</strong> Dépan.Pro SAS</li>
              <li><strong>Siège social :</strong> Paris, France</li>
              <li><strong>Email :</strong> contact@depan-pro.com</li>
              <li><strong>Directeur de la publication :</strong> [Nom du directeur]</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <ul className="list-none space-y-1">
              <li><strong>Hébergeur :</strong> [Nom de l'hébergeur]</li>
              <li><strong>Adresse :</strong> [Adresse de l'hébergeur]</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Propriété intellectuelle</h2>
            <p>L'ensemble du contenu du site Dépan.Pro (textes, images, graphismes, logo, icônes, sons, logiciels, etc.) est la propriété exclusive de Dépan.Pro SAS, à l'exception des marques, logos ou contenus appartenant à d'autres sociétés partenaires ou auteurs.</p>
            <p>Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sauf autorisation écrite préalable de Dépan.Pro.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Protection des données personnelles</h2>
            <p>Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.</p>
            <p>Pour plus d'informations, consultez notre <a href="/politique-de-confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Cookies</h2>
            <p>Le site utilise des cookies pour améliorer l'expérience utilisateur. Pour en savoir plus, consultez notre <a href="/politique-cookies" className="text-primary hover:underline">Politique de cookies</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Limitation de responsabilité</h2>
            <p>Dépan.Pro met tout en œuvre pour assurer l'exactitude et la mise à jour des informations diffusées sur le site. Toutefois, Dépan.Pro ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Droit applicable</h2>
            <p>Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalNoticePage;
