import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';

export default function AdminConfigHistoryPage() {
  return (
    <AdminLayout title="Historique Configuration" subtitle="Versionnage des modifications">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des modifications
          </CardTitle>
          <CardDescription>
            Suivez toutes les modifications de configuration du système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            L'historique des modifications de configuration sera affiché ici
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
