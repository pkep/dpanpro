import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/auth.types';
import { Wrench } from 'lucide-react';
import logo from '@/assets/logo.png';

type AuthView = 'login' | 'register' | 'forgot-password';

export default function Auth() {
  const [view, setView] = useState<AuthView>('login');
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSuccess = (user?: User) => {
    if (user?.role === 'technician') {
      navigate('/technician', { replace: true });
    } else if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-secondary p-12 text-secondary-foreground">
        <div className="flex items-center gap-3">
          <img src={logo} alt="DépanPro" className="h-10 w-10 object-contain" />
          <span className="text-2xl font-bold">DépanPro</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            La solution complète pour vos interventions
          </h1>
          <p className="text-lg text-secondary-foreground/80">
            Gérez efficacement vos demandes d'intervention, suivez vos techniciens en temps réel et optimisez votre activité.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-8">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Gestion simplifiée</h3>
                <p className="text-sm text-secondary-foreground/70">
                  Créez et suivez vos interventions facilement
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Temps réel</h3>
                <p className="text-sm text-secondary-foreground/70">
                  Suivi en direct de vos techniciens
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-secondary-foreground/60">
          © 2024 DépanPro. Tous droits réservés.
        </p>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <img src={logo} alt="DépanPro" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-foreground">DépanPro</span>
          </div>

          {view === 'login' && (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setView('register')}
              onForgotPassword={() => setView('forgot-password')}
            />
          )}
          {view === 'register' && (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setView('login')}
            />
          )}
          {view === 'forgot-password' && (
            <ForgotPasswordForm onBack={() => setView('login')} />
          )}
        </div>
      </div>
    </div>
  );
}
