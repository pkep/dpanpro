import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LiveTrackingMap } from '@/components/map/LiveTrackingMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TechnicianLayout } from '@/components/technician/TechnicianLayout';
import { Radio } from 'lucide-react';

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
    <TechnicianLayout title="Suivi en temps réel" subtitle="Position des techniciens et interventions actives">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500" />
            Carte en direct
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LiveTrackingMap height="calc(100vh - 220px)" showInterventions={true} />
        </CardContent>
      </Card>
    </TechnicianLayout>
  );
}
