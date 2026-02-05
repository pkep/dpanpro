import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      setIsIOS(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <section className="bg-primary/5 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <CheckCircle className="h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Application installée !</h2>
            <p className="text-muted-foreground">Vous pouvez accéder à Dépan.Pro depuis votre écran d'accueil.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Installez l'application Dépan.Pro
            </h2>
            <p className="text-muted-foreground">
              Accédez rapidement à nos services depuis votre écran d'accueil. Pas besoin de téléchargement sur un store, l'application est gratuite et instantanée.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" /> Accès rapide
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" /> Fonctionne hors-ligne
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-primary" /> Notifications
            </span>
          </div>

          {deferredPrompt ? (
            <Button size="lg" onClick={handleInstall} className="gap-2">
              <Download className="h-5 w-5" />
              Installer l'application
            </Button>
          ) : isIOS ? (
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              <p>
                Sur iPhone/iPad : appuyez sur{" "}
                <span className="font-semibold text-foreground">Partager</span> puis{" "}
                <span className="font-semibold text-foreground">Sur l'écran d'accueil</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              <p>
                Ouvrez ce site dans votre navigateur, puis utilisez le menu pour{" "}
                <span className="font-semibold text-foreground">Installer l'application</span> ou{" "}
                <span className="font-semibold text-foreground">Ajouter à l'écran d'accueil</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
