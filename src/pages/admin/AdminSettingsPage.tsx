import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Wrench, Users, Percent, Cog, Shield } from 'lucide-react';
import { ServicesSettingsTab } from '@/components/admin/settings/ServicesSettingsTab';

export default function AdminSettingsPage() {
  return (
    <AdminLayout title="Administration" subtitle="Configuration système">
      <div className="space-y-6">
        <Tabs defaultValue="services" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Priorités
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="commission" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Commission
            </TabsTrigger>
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Algorithme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <ServicesSettingsTab />
          </TabsContent>

          <TabsContent value="priorities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Multiplicateurs de priorité
                </CardTitle>
                <CardDescription>
                  Configurer les multiplicateurs de prix par niveau d'urgence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La configuration des priorités sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des utilisateurs
                </CardTitle>
                <CardDescription>
                  Créer des managers et administrateurs, gérer les droits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Créer un Manager</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Formulaire de création de manager
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Créer un Administrateur</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Formulaire de création d'administrateur
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Droits des managers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Gestion des permissions de création de managers
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Commission
                </CardTitle>
                <CardDescription>
                  Configurer le pourcentage de commission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La configuration de la commission sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Algorithme de dispatch
                </CardTitle>
                <CardDescription>
                  Configurer les poids de l'algorithme de sélection des techniciens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Proximité</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">40%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Compétences</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">30%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Charge travail</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">20%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Note client</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">10%</div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Les contrôles d'édition des poids seront ajoutés ici
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
