import { AdminLayout } from '@/components/admin/AdminLayout';
import { LiveTrackingMap } from '@/components/map/LiveTrackingMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio } from 'lucide-react';

export default function AdminLiveTrackingPage() {
  return (
    <AdminLayout title="Suivi en temps réel" subtitle="Position des techniciens et interventions actives">
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
    </AdminLayout>
  );
}
