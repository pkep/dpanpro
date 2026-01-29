import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function AdminPlanningPage() {
  return (
    <AdminLayout title="Planning" subtitle="Gestion des plannings techniciens">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning des techniciens
          </CardTitle>
          <CardDescription>
            Visualisez et gérez les disponibilités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Le calendrier de planning sera affiché ici
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
