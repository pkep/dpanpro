import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, Activity, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface LogRow {
  id: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  context: Record<string, unknown> | null;
  intervention_id: string | null;
  created_at: string;
}

interface Summary {
  counts: {
    errors7d: number;
    warns7d: number;
    pendingDisputes: number;
    stuckInterventions: number;
  };
  dispatchByStatus: Record<string, number>;
  recentLogs: LogRow[];
  stuckInterventions: Array<{
    id: string;
    tracking_code: string;
    created_at: string;
    status: string;
  }>;
  batchLastRun: Record<string, { created_at: string; level: string; message: string }>;
  generatedAt: string;
}

const levelBadge = (level: string) => {
  if (level === "error") return <Badge variant="destructive">erreur</Badge>;
  if (level === "warn")
    return (
      <Badge className="bg-amber-500 hover:bg-amber-600 text-white">avertissement</Badge>
    );
  return <Badge variant="secondary">info</Badge>;
};

export default function AdminMonitoringPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "error" | "warn" | "info">("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke(
        "admin-monitoring-summary",
      );
      if (err) throw err;
      setData(res as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  const filteredLogs = (data?.recentLogs ?? []).filter((l) => {
    if (levelFilter !== "all" && l.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="h-6 w-6 text-primary" />
                  Monitoring back-end
                </h1>
                <p className="text-sm text-muted-foreground">
                  Logs d'exécution, erreurs et état des batchs
                  {data?.generatedAt && (
                    <> · MAJ {formatDistanceToNow(new Date(data.generatedAt), { locale: fr, addSuffix: true })}</>
                  )}
                </p>
              </div>
              <Button onClick={load} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Rafraîchir
              </Button>
            </div>

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6 text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {error}
                </CardContent>
              </Card>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Erreurs 7j
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {data?.counts.errors7d ?? "—"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Avertissements 7j
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500">
                    {data?.counts.warns7d ?? "—"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Litiges en attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data?.counts.pendingDisputes ?? "—"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Interventions bloquées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">
                    {data?.counts.stuckInterventions ?? "—"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    sans technicien depuis &gt; 30 min
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="logs">
              <TabsList>
                <TabsTrigger value="logs">Logs ({data?.recentLogs.length ?? 0})</TabsTrigger>
                <TabsTrigger value="batches">Batchs</TabsTrigger>
                <TabsTrigger value="dispatch">Dispatch 7j</TabsTrigger>
                <TabsTrigger value="stuck">
                  Interventions bloquées ({data?.stuckInterventions.length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="logs" className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Rechercher (source, message)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  {(["all", "error", "warn", "info"] as const).map((l) => (
                    <Button
                      key={l}
                      size="sm"
                      variant={levelFilter === l ? "default" : "outline"}
                      onClick={() => setLevelFilter(l)}
                    >
                      {l === "all" ? "Tous" : l}
                    </Button>
                  ))}
                </div>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[110px]">Niveau</TableHead>
                          <TableHead className="w-[180px]">Source</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead className="w-[140px]">Quand</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Aucun log
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredLogs.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>{levelBadge(l.level)}</TableCell>
                            <TableCell className="font-mono text-xs">{l.source}</TableCell>
                            <TableCell className="text-sm">
                              <div>{l.message}</div>
                              {l.context && (
                                <details className="text-xs text-muted-foreground mt-1">
                                  <summary className="cursor-pointer">contexte</summary>
                                  <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(l.context, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(l.created_at), {
                                locale: fr,
                                addSuffix: true,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="batches">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dernière exécution par batch</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(data?.batchLastRun ?? {}).length === 0 ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Aucun run de batch enregistré dans system_logs.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batch</TableHead>
                            <TableHead>Dernier message</TableHead>
                            <TableHead className="w-[140px]">Quand</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(data!.batchLastRun).map(([source, run]) => (
                            <TableRow key={source}>
                              <TableCell className="font-mono text-xs flex items-center gap-2">
                                {levelBadge(run.level)}
                                {source}
                              </TableCell>
                              <TableCell className="text-sm">{run.message}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatDistanceToNow(new Date(run.created_at), {
                                  locale: fr,
                                  addSuffix: true,
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dispatch">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tentatives de dispatch (7j)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(data?.dispatchByStatus ?? {}).map(([s, n]) => (
                        <div key={s} className="border rounded-lg p-3">
                          <div className="text-xs text-muted-foreground uppercase">{s}</div>
                          <div className="text-2xl font-bold">{n}</div>
                        </div>
                      ))}
                      {Object.keys(data?.dispatchByStatus ?? {}).length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full">
                          Aucune tentative sur 7j.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stuck">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Créée</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.stuckInterventions ?? []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Aucune intervention bloquée 🎉
                            </TableCell>
                          </TableRow>
                        )}
                        {(data?.stuckInterventions ?? []).map((i) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-mono text-xs">{i.tracking_code}</TableCell>
                            <TableCell>{i.status}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(i.created_at), {
                                locale: fr,
                                addSuffix: true,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
