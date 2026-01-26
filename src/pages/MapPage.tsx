import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { InterventionsMap } from '@/components/map/InterventionsMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Map } from 'lucide-react';

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
    <TechnicianLayout title="Carte des interventions" subtitle="Visualisez toutes les interventions sur la carte">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Toutes les interventions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InterventionsMap height="calc(100vh - 220px)" showFilters={true} />
        </CardContent>
      </Card>
    </TechnicianLayout>
  );
}
