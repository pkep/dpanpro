import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface Resultat {
  id: string;
  domaine_code: string;
  slug: string;
  nom: string;
  description: string | null;
  prix_min: number | null;
  prix_max: number | null;
  unite_prix: string;
  duree_min_minutes: number | null;
  duree_max_minutes: number | null;
  urgence_disponible: boolean;
  garantie_jours: number | null;
  is_active: boolean;
  display_order: number;
}

interface Variante {
  id: string;
  resultat_id: string;
  nom: string;
  description: string | null;
  prix_min: number | null;
  prix_max: number | null;
  display_order: number;
  is_active: boolean;
}

const DOMAINS = [
  { code: 'plumbing', label: 'Plomberie' },
  { code: 'electricity', label: 'Électricité' },
  { code: 'locksmith', label: 'Serrurerie' },
  { code: 'glazing', label: 'Vitrerie' },
  { code: 'heating', label: 'Chauffage' },
  { code: 'aircon', label: 'Climatisation' },
];

export function ResultatsManager() {
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState('all');
  const [expandedResultat, setExpandedResultat] = useState<string | null>(null);

  // Dialogs
  const [resultatDialog, setResultatDialog] = useState<{ open: boolean; resultat?: Resultat }>({ open: false });
  const [varianteDialog, setVarianteDialog] = useState<{ open: boolean; variante?: Variante; resultatId?: string }>({ open: false });

  // Forms
  const [rForm, setRForm] = useState<Partial<Resultat>>({});
  const [vForm, setVForm] = useState<Partial<Variante>>({});

  const fetchData = async () => {
    setLoading(true);
    const [resRes, varRes] = await Promise.all([
      supabase.from('questionnaire_resultats').select('*').order('domaine_code, display_order'),
      supabase.from('questionnaire_variantes').select('*').order('display_order'),
    ]);
    if (resRes.data) setResultats(resRes.data as Resultat[]);
    if (varRes.data) setVariantes(varRes.data as Variante[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filterDomain === 'all' ? resultats : resultats.filter(r => r.domaine_code === filterDomain);

  // Resultat CRUD
  const openResultatDialog = (resultat?: Resultat) => {
    setRForm(resultat ? { ...resultat } : {
      domaine_code: filterDomain === 'all' ? 'plumbing' : filterDomain,
      nom: '', slug: '', description: '', prix_min: null, prix_max: null,
      unite_prix: 'TTC_forfait', duree_min_minutes: null, duree_max_minutes: null,
      urgence_disponible: true, garantie_jours: 365, is_active: true, display_order: resultats.length,
    });
    setResultatDialog({ open: true, resultat });
  };

  const saveResultat = async () => {
    const data = {
      domaine_code: rForm.domaine_code!,
      nom: rForm.nom!,
      slug: rForm.slug || rForm.nom!.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: rForm.description || null,
      prix_min: rForm.prix_min ?? null,
      prix_max: rForm.prix_max ?? null,
      unite_prix: rForm.unite_prix || 'TTC_forfait',
      duree_min_minutes: rForm.duree_min_minutes ?? null,
      duree_max_minutes: rForm.duree_max_minutes ?? null,
      urgence_disponible: rForm.urgence_disponible ?? true,
      garantie_jours: rForm.garantie_jours ?? null,
      is_active: rForm.is_active ?? true,
      display_order: rForm.display_order ?? 0,
    };
    if (resultatDialog.resultat) {
      const { error } = await supabase.from('questionnaire_resultats').update(data).eq('id', resultatDialog.resultat.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Résultat mis à jour');
    } else {
      const { error } = await supabase.from('questionnaire_resultats').insert(data);
      if (error) { toast.error(error.message); return; }
      toast.success('Résultat créé');
    }
    setResultatDialog({ open: false });
    fetchData();
  };

  const deleteResultat = async (id: string) => {
    if (!confirm('Supprimer ce résultat et ses variantes ?')) return;
    await supabase.from('questionnaire_variantes').delete().eq('resultat_id', id);
    const { error } = await supabase.from('questionnaire_resultats').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Résultat supprimé');
    fetchData();
  };

  // Variante CRUD
  const openVarianteDialog = (resultatId: string, variante?: Variante) => {
    setVForm(variante ? { ...variante } : { resultat_id: resultatId, nom: '', prix_min: null, prix_max: null, display_order: 0, is_active: true });
    setVarianteDialog({ open: true, variante, resultatId });
  };

  const saveVariante = async () => {
    const data = {
      resultat_id: varianteDialog.resultatId!,
      nom: vForm.nom!,
      description: vForm.description || null,
      prix_min: vForm.prix_min ?? null,
      prix_max: vForm.prix_max ?? null,
      display_order: vForm.display_order ?? 0,
      is_active: vForm.is_active ?? true,
    };
    if (varianteDialog.variante) {
      const { error } = await supabase.from('questionnaire_variantes').update(data).eq('id', varianteDialog.variante.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Variante mise à jour');
    } else {
      const { error } = await supabase.from('questionnaire_variantes').insert(data);
      if (error) { toast.error(error.message); return; }
      toast.success('Variante créée');
    }
    setVarianteDialog({ open: false });
    fetchData();
  };

  const deleteVariante = async (id: string) => {
    if (!confirm('Supprimer cette variante ?')) return;
    const { error } = await supabase.from('questionnaire_variantes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Variante supprimée');
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Résultats & Variantes tarifées</CardTitle>
            <CardDescription>{resultats.length} résultats · {variantes.length} variantes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterDomain} onValueChange={setFilterDomain}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {DOMAINS.map(d => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => openResultatDialog()} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Résultat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(r => {
              const rVariantes = variantes.filter(v => v.resultat_id === r.id).sort((a, b) => a.display_order - b.display_order);
              const isExpanded = expandedResultat === r.id;
              return (
                <div key={r.id} className={`border rounded-lg ${!r.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setExpandedResultat(isExpanded ? null : r.id)}>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-sm flex-1">{r.nom}</span>
                    <Badge variant="outline" className="text-[10px]">{DOMAINS.find(d => d.code === r.domaine_code)?.label}</Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.prix_min && r.prix_max ? `${r.prix_min}–${r.prix_max} €` : 'Sur devis'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{rVariantes.length} var.</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openResultatDialog(r); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); deleteResultat(r.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {r.urgence_disponible && <Badge variant="outline">Urgence 24/7</Badge>}
                        {r.garantie_jours && <Badge variant="outline">Garantie {r.garantie_jours}j</Badge>}
                        {r.duree_min_minutes && <Badge variant="outline">{r.duree_min_minutes}–{r.duree_max_minutes} min</Badge>}
                      </div>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground">Variantes tarifées</p>
                      {rVariantes.map(v => (
                        <div key={v.id} className="flex items-center gap-2 pl-4 py-1 border-l-2 border-primary/20">
                          <span className="text-sm flex-1">{v.nom}</span>
                          <span className="text-xs text-muted-foreground">
                            {v.prix_min && v.prix_max ? `${v.prix_min}–${v.prix_max} €` : 'Sur devis'}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openVarianteDialog(r.id, v)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteVariante(v.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="ml-4" onClick={() => openVarianteDialog(r.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Variante
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resultat Dialog */}
      <Dialog open={resultatDialog.open} onOpenChange={o => setResultatDialog({ open: o })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{resultatDialog.resultat ? 'Modifier le résultat' : 'Nouveau résultat'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Domaine *</Label>
                <Select value={rForm.domaine_code || 'plumbing'} onValueChange={v => setRForm(f => ({ ...f, domaine_code: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map(d => <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordre</Label>
                <Input type="number" value={rForm.display_order ?? 0} onChange={e => setRForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={rForm.nom || ''} onChange={e => setRForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Débouchage WC" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={rForm.slug || ''} onChange={e => setRForm(f => ({ ...f, slug: e.target.value }))} placeholder="Auto-généré si vide" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={rForm.description || ''} onChange={e => setRForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix min (€)</Label>
                <Input type="number" value={rForm.prix_min ?? ''} onChange={e => setRForm(f => ({ ...f, prix_min: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Prix max (€)</Label>
                <Input type="number" value={rForm.prix_max ?? ''} onChange={e => setRForm(f => ({ ...f, prix_max: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Durée min (min)</Label>
                <Input type="number" value={rForm.duree_min_minutes ?? ''} onChange={e => setRForm(f => ({ ...f, duree_min_minutes: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Durée max (min)</Label>
                <Input type="number" value={rForm.duree_max_minutes ?? ''} onChange={e => setRForm(f => ({ ...f, duree_max_minutes: e.target.value ? parseInt(e.target.value) : null }))} />
              </div>
            </div>
            <div>
              <Label>Garantie (jours)</Label>
              <Input type="number" value={rForm.garantie_jours ?? ''} onChange={e => setRForm(f => ({ ...f, garantie_jours: e.target.value ? parseInt(e.target.value) : null }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={rForm.urgence_disponible ?? true} onCheckedChange={v => setRForm(f => ({ ...f, urgence_disponible: v }))} />
              <Label>Urgence disponible</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={rForm.is_active ?? true} onCheckedChange={v => setRForm(f => ({ ...f, is_active: v }))} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultatDialog({ open: false })}>Annuler</Button>
            <Button onClick={saveResultat} disabled={!rForm.nom?.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variante Dialog */}
      <Dialog open={varianteDialog.open} onOpenChange={o => setVarianteDialog({ open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{varianteDialog.variante ? 'Modifier la variante' : 'Nouvelle variante'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={vForm.nom || ''} onChange={e => setVForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: WC standard (furet)" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={vForm.description || ''} onChange={e => setVForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix min (€)</Label>
                <Input type="number" value={vForm.prix_min ?? ''} onChange={e => setVForm(f => ({ ...f, prix_min: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <Label>Prix max (€)</Label>
                <Input type="number" value={vForm.prix_max ?? ''} onChange={e => setVForm(f => ({ ...f, prix_max: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
            <div>
              <Label>Ordre</Label>
              <Input type="number" value={vForm.display_order ?? 0} onChange={e => setVForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={vForm.is_active ?? true} onCheckedChange={v => setVForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarianteDialog({ open: false })}>Annuler</Button>
            <Button onClick={saveVariante} disabled={!vForm.nom?.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
