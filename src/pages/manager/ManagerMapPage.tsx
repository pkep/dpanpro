import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

export default function ManagerMapPage() {
  return (
    <ManagerLayout title="Carte Techniciens" subtitle="Localisation en temps réel">
      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Localisation des techniciens
          </CardTitle>
          <CardDescription>
            Visualisez tous les techniciens disponibles et en intervention
          </CardDescription>
        </CardHeader>
        <CardContent className="h-full">
          <p className="text-muted-foreground text-center py-8">
            La carte interactive avec les positions des techniciens sera affichée ici
          </p>
        </CardContent>
      </Card>
    </ManagerLayout>
  );
}
