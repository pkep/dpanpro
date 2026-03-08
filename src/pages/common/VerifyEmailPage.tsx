import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

type VerifyState = 'loading' | 'success' | 'expired' | 'invalid' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>('loading');
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    verifyToken(token);
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      // Find the token
      const { data: tokenData, error } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .maybeSingle();

      if (error || !tokenData) {
        setState('invalid');
        return;
      }

      // Check if expired
      if (new Date(tokenData.expires_at) < new Date()) {
        // Get user email for resend button
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', tokenData.user_id)
          .single();
        if (userData) setResendEmail(userData.email);
        setState('expired');
        return;
      }

      // Mark token as used
      await supabase
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      // Activate user
      await supabase
        .from('users')
        .update({ is_active: true } as any)
        .eq('id', tokenData.user_id);

      setState('success');
    } catch {
      setState('error');
    }
  };

  const handleResend = async () => {
    if (!resendEmail) return;
    setResending(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, email')
        .eq('email', resendEmail)
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

        {state === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Vérification en cours...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Email confirmé !</h1>
            <p className="text-muted-foreground">
              Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant vous connecter.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        )}

        {state === 'expired' && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Lien expiré</h1>
            <p className="text-muted-foreground">
              Ce lien de vérification a expiré. Les liens sont valides pendant 15 minutes.
            </p>
            {resendEmail && !resendSuccess && (
              <Button onClick={handleResend} disabled={resending} className="w-full">
                {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="mr-2 h-4 w-4" />
                Renvoyer un lien de vérification
              </Button>
            )}
            {resendSuccess && (
              <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                Un nouveau lien de vérification a été envoyé à {resendEmail}
              </div>
            )}
          </div>
        )}

        {state === 'invalid' && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Lien invalide</h1>
            <p className="text-muted-foreground">
              Ce lien de vérification est invalide ou a déjà été utilisé.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Retour à la connexion</Link>
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Erreur</h1>
            <p className="text-muted-foreground">
              Une erreur est survenue lors de la vérification. Veuillez réessayer.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Retour à la connexion</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
