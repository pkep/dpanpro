import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CheckCircle, Clock, Wallet, AlertTriangle } from 'lucide-react';

export default function AdminTechniciansPage() {
  return (
    <AdminLayout title="Gestion des Techniciens" subtitle="Validation, dispatch et suivi">
      <div className="space-y-6">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Actifs
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Versements
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Litiges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Profils en attente de validation</CardTitle>
                <CardDescription>
                  Examinez et validez les demandes des nouveaux techniciens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La liste des profils en attente sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Techniciens actifs</CardTitle>
                <CardDescription>
                  Gérez les techniciens actuellement sur la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La liste des techniciens actifs sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatch">
            <Card>
              <CardHeader>
                <CardTitle>Dispatch manuel</CardTitle>
                <CardDescription>
                  Assignez manuellement des interventions à des techniciens spécifiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  L'interface de dispatch manuel sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Versements techniciens</CardTitle>
                <CardDescription>
                  Gérez les paiements et versements en lot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La gestion des versements sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des litiges</CardTitle>
                <CardDescription>
                  Résolvez les conflits et réclamations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La gestion des litiges sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
