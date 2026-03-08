import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

export default function EmailPendingPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, email')
        .eq('email', email.toLowerCase())
        .single();

      if (userData) {
        await supabase.functions.invoke('send-verification-email', {
          body: {
            userId: userData.id,
            email: userData.email,
            firstName: (userData as any).first_name,
          },
        });
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 30000);
      }
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logo} alt="Dépan.Pro" className="h-10 w-10 object-contain" />
          <span className="text-2xl font-bold text-foreground">Dépan.Pro</span>
        </Link>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">Vérifiez votre email</h1>
        
        <p className="text-muted-foreground">
          Un email de confirmation a été envoyé à{' '}
          <strong className="text-foreground">{email}</strong>.
          Cliquez sur le lien dans l'email pour activer votre compte.
        </p>

        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p>Le lien est valide pendant <strong>15 minutes</strong>.</p>
          <p className="mt-1">Pensez à vérifier vos spams si vous ne trouvez pas l'email.</p>
        </div>

        {!resendSuccess ? (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full"
          >
            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Renvoyer l'email de vérification
          </Button>
        ) : (
          <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
            Un nouveau lien a été envoyé !
          </div>
        )}

        <Button asChild variant="ghost" className="w-full">
          <Link to="/auth">Retour à la connexion</Link>
        </Button>
      </div>
    </div>
  );
}
