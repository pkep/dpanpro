import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function Footer() {
  const { phoneNumber } = useSiteSettings();
  const phoneLink = phoneNumber.replace(/\s/g, "");

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="DépanPro" className="h-8 w-auto" />
              <span className="text-xl font-bold text-foreground">DépanPro</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Votre partenaire de confiance pour tous vos dépannages d'urgence, 24h/24 et 7j/7 partout en France.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground">Nos services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/new-intervention?service=locksmith" className="hover:text-foreground">
                  Serrurerie
                </Link>
              </li>
              <li>
                <Link to="/new-intervention?service=plumbing" className="hover:text-foreground">
                  Plomberie
                </Link>
              </li>
              <li>
                <Link to="/new-intervention?service=electricity" className="hover:text-foreground">
                  Électricité
                </Link>
              </li>
              <li>
                <Link to="/new-intervention?service=glazing" className="hover:text-foreground">
                  Vitrerie
                </Link>
              </li>
              <li>
                <Link to="/new-intervention?service=heating" className="hover:text-foreground">
                  Chauffage
                </Link>
              </li>
              <li>
                <Link to="/new-intervention?service=aircon" className="hover:text-foreground">
                  Climatisation
                </Link>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground">Liens utiles</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/join" className="hover:text-foreground">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-foreground">
                  Se connecter
                </Link>
              </li>
              <li>
                <Link to="/auth?register=true" className="hover:text-foreground">
                  Créer un compte
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${phoneLink}`} className="hover:text-foreground">
                  {phoneNumber || "0 800 123 456"}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:contact@depan-pro.com" className="hover:text-foreground">
                  contact@depanpro.fr
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                <span>Paris, France</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DépanPro. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
