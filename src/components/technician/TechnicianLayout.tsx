import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTechnicianPhotoCheck } from '@/hooks/useTechnicianPhotoCheck';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TechnicianSidebar } from './TechnicianSidebar';
import { TechnicianHeader } from './TechnicianHeader';
import { RequiredPhotosModal } from './RequiredPhotosModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TechnicianLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function TechnicianLayout({ children, title, subtitle }: TechnicianLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { needsPhoto, isLoading: isCheckingPhoto, markPhotoComplete } = useTechnicianPhotoCheck();
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show photo modal when needed
  useEffect(() => {
    if (!isCheckingPhoto && needsPhoto && user?.role === 'technician') {
      setShowPhotoModal(true);
    }
  }, [isCheckingPhoto, needsPhoto, user?.role]);

  const handlePhotoComplete = () => {
    markPhotoComplete();
    setShowPhotoModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user is a technician
  if (user.role !== 'technician' && user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cette page est réservée aux techniciens.
            </p>
            <Button asChild className="w-full">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <TechnicianSidebar />
        <div className="flex-1 flex flex-col">
          <TechnicianHeader title={title} subtitle={subtitle} />
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
      
      {/* Modal obligatoire pour la photo de profil */}
      <RequiredPhotosModal
        open={showPhotoModal}
        onComplete={handlePhotoComplete}
      />
    </SidebarProvider>
  );
}
