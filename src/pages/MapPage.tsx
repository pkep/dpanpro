import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { InterventionsMap } from '@/components/map/InterventionsMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { Home, Map, ArrowLeft } from 'lucide-react';

export default function MapPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // Only admin and technicians can access the full map
  if (user.role !== 'admin' && user.role !== 'technician') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Carte des interventions</h1>
              <p className="text-sm text-muted-foreground">
                Visualisez toutes les interventions sur la carte
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <Button variant="outline" asChild>
              <Link to={user.role === 'admin' ? '/admin' : '/technician'}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Toutes les interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InterventionsMap height="calc(100vh - 280px)" showFilters={true} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
