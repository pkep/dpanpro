import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ManagerSidebar } from './ManagerSidebar';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ManagerLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function ManagerLayout({ children, title, subtitle }: ManagerLayoutProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdminOrManager, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();

  const isLoading = authLoading || rolesLoading;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user has manager or admin role
  if (!isAdminOrManager()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cette page est réservée aux managers et administrateurs.
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
        <ManagerSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                {title && (
                  <div>
                    <h1 className="font-semibold">{title}</h1>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>
              <NotificationsDropdown />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
