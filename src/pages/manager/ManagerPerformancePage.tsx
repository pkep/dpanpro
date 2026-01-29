import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, Clock, Star, Target, Map, Award } from 'lucide-react';

export default function ManagerPerformancePage() {
  return (
    <ManagerLayout title="Dashboard Performance" subtitle="KPIs et analyses">
      <div className="space-y-6">
        {/* KPIs Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Temps réponse moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">-- min</div>
              <p className="text-xs text-green-600">Objectif: &lt;30 min</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Temps arrivée moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">-- min</div>
              <p className="text-xs text-green-600">Objectif: &lt;45 min</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Taux résolution 1er passage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">--%</div>
              <p className="text-xs text-green-600">Objectif: &gt;85%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Satisfaction client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold flex items-center gap-1">
                --/5 <Star className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xs text-green-600">Objectif: &gt;4.5</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Taux acceptation tech.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">--%</div>
              <p className="text-xs text-green-600">Objectif: &gt;90%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                CA/Technicien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">-- €</div>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Rapports
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyse Performance
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Classement
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Prévisions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Rapports</CardTitle>
                <CardDescription>
                  Export PDF/CSV quotidien, hebdomadaire, mensuel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Les options d'export de rapports seront affichées ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Analyse de performance</CardTitle>
                <CardDescription>
                  Temps de réponse, taux de résolution, satisfaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Les graphiques d'analyse seront affichés ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap">
            <Card>
              <CardHeader>
                <CardTitle>Heatmap géographique</CardTitle>
                <CardDescription>
                  Zones à forte demande
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  La carte heatmap sera affichée ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Classement techniciens</CardTitle>
                <CardDescription>
                  Évaluations et statistiques par technicien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Le classement des techniciens sera affiché ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>Prévisions</CardTitle>
                <CardDescription>
                  Estimation des pics de demande basée sur l'historique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Les prévisions de demande seront affichées ici
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ManagerLayout>
  );
}
