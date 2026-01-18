import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LiveTrackingMap } from '@/components/map/LiveTrackingMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { Home, Radio, ArrowLeft } from 'lucide-react';

export default function LiveTrackingPage() {
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

  // Only admin and technicians can access live tracking
  if (user.role !== 'admin' && user.role !== 'technician') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-8 w-8 text-green-500 animate-pulse" />
            <div>
              <h1 className="text-xl font-bold">Suivi en temps réel</h1>
              <p className="text-sm text-muted-foreground">
                Position des techniciens et interventions actives
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
              <Radio className="h-5 w-5 text-green-500" />
              Carte en direct
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveTrackingMap height="calc(100vh - 300px)" showInterventions={true} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
