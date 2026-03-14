import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown, ArrowRight,
  GripVertical, Loader2, Eye, EyeOff, Target
} from 'lucide-react';
import { IconPicker } from './IconPicker';

interface DbQuestion {
  id: string;
  domaine_code: string;
  libelle: string;
  sous_libelle: string | null;
  est_racine: boolean;
  parent_reponse_id: string | null;
  display_order: number;
  is_active: boolean;
  image_url: string | null;
}

interface DbReponse {
  id: string;
  question_id: string;
  next_question_id: string | null;
  resultat_id: string | null;
  label: string;
  icone: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface DbResultat {
  id: string;
  nom: string;
  slug: string;
}

interface DomainTabProps {
  domainCode: string;
  domainLabel: string;
  domainIcon: string;
}

export function DomainTab({ domainCode, domainLabel, domainIcon }: DomainTabProps) {
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [reponses, setReponses] = useState<DbReponse[]>([]);
  const [resultats, setResultats] = useState<DbResultat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Dialog state
  const [questionDialog, setQuestionDialog] = useState<{ open: boolean; question?: DbQuestion }>({ open: false });
  const [reponseDialog, setReponseDialog] = useState<{ open: boolean; reponse?: DbReponse; questionId?: string }>({ open: false });

  // Form state
  const [questionForm, setQuestionForm] = useState({ libelle: '', sous_libelle: '', est_racine: false, display_order: 0 });
  const [reponseForm, setReponseForm] = useState({ label: '', icone: '', next_question_id: '', resultat_id: '', display_order: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [qRes, rRes, resRes] = await Promise.all([
      supabase.from('questionnaire_questions').select('*').eq('domaine_code', domainCode).order('display_order'),
      supabase.from('questionnaire_reponses').select('*').order('display_order'),
      supabase.from('questionnaire_resultats').select('id, nom, slug').eq('domaine_code', domainCode).order('nom'),
    ]);
    if (qRes.data) setQuestions(qRes.data as DbQuestion[]);
    if (rRes.data) {
      const questionIds = new Set((qRes.data || []).map((q: any) => q.id));
      setReponses((rRes.data as DbReponse[]).filter(r => questionIds.has(r.question_id)));
    }
    if (resRes.data) setResultats(resRes.data as DbResultat[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [domainCode]);

  const toggleExpand = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Question CRUD
  const openQuestionDialog = (question?: DbQuestion) => {
    if (question) {
      setQuestionForm({ libelle: question.libelle, sous_libelle: question.sous_libelle || '', est_racine: question.est_racine, display_order: question.display_order });
    } else {
      setQuestionForm({ libelle: '', sous_libelle: '', est_racine: false, display_order: questions.length });
    }
    setQuestionDialog({ open: true, question });
  };

  const saveQuestion = async () => {
    const data = {
      domaine_code: domainCode,
      libelle: questionForm.libelle,
      sous_libelle: questionForm.sous_libelle || null,
      est_racine: questionForm.est_racine,
      display_order: questionForm.display_order,
    };
    if (questionDialog.question) {
      const { error } = await supabase.from('questionnaire_questions').update(data).eq('id', questionDialog.question.id);
      if (error) { toast.error('Erreur: ' + error.message); return; }
      toast.success('Question mise à jour');
    } else {
      const { error } = await supabase.from('questionnaire_questions').insert(data);
      if (error) { toast.error('Erreur: ' + error.message); return; }
      toast.success('Question créée');
    }
    setQuestionDialog({ open: false });
    fetchData();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Supprimer cette question et ses réponses ?')) return;
    // Delete associated reponses first
    await supabase.from('questionnaire_reponses').delete().eq('question_id', id);
    const { error } = await supabase.from('questionnaire_questions').delete().eq('id', id);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Question supprimée');
    fetchData();
  };

  const toggleQuestionActive = async (q: DbQuestion) => {
    await supabase.from('questionnaire_questions').update({ is_active: !q.is_active }).eq('id', q.id);
    fetchData();
  };

  // Reponse CRUD
  const openReponseDialog = (questionId: string, reponse?: DbReponse) => {
    if (reponse) {
      setReponseForm({
        label: reponse.label, icone: reponse.icone || '',
        next_question_id: reponse.next_question_id || '', resultat_id: reponse.resultat_id || '',
        display_order: reponse.display_order
      });
    } else {
      const existing = reponses.filter(r => r.question_id === questionId);
      setReponseForm({ label: '', icone: '', next_question_id: '', resultat_id: '', display_order: existing.length });
    }
    setReponseDialog({ open: true, reponse, questionId });
  };

  const saveReponse = async () => {
    const data: any = {
      question_id: reponseDialog.questionId,
      label: reponseForm.label,
      icone: reponseForm.icone || null,
      next_question_id: reponseForm.next_question_id || null,
      resultat_id: reponseForm.resultat_id || null,
      display_order: reponseForm.display_order,
    };
    if (reponseDialog.reponse) {
      const { error } = await supabase.from('questionnaire_reponses').update(data).eq('id', reponseDialog.reponse.id);
      if (error) { toast.error('Erreur: ' + error.message); return; }
      toast.success('Réponse mise à jour');
    } else {
      const { error } = await supabase.from('questionnaire_reponses').insert(data);
      if (error) { toast.error('Erreur: ' + error.message); return; }
      toast.success('Réponse créée');
    }
    setReponseDialog({ open: false });
    fetchData();
  };

  const deleteReponse = async (id: string) => {
    if (!confirm('Supprimer cette réponse ?')) return;
    const { error } = await supabase.from('questionnaire_reponses').delete().eq('id', id);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Réponse supprimée');
    fetchData();
  };

  const getReponsesForQuestion = (qId: string) => reponses.filter(r => r.question_id === qId).sort((a, b) => a.display_order - b.display_order);

  const getQuestionById = (id: string) => questions.find(q => q.id === id);
  const getResultatById = (id: string) => resultats.find(r => r.id === id);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const rootQuestions = questions.filter(q => q.est_racine).sort((a, b) => a.display_order - b.display_order);
  const childQuestions = questions.filter(q => !q.est_racine);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{domainIcon}</span> {domainLabel}
            </CardTitle>
            <CardDescription>{questions.length} questions · {reponses.length} réponses · {resultats.length} résultats</CardDescription>
          </div>
          <Button onClick={() => openQuestionDialog()} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {rootQuestions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune question racine. Créez-en une pour commencer.</p>
          )}
          {rootQuestions.map(q => (
            <QuestionNode
              key={q.id}
              question={q}
              reponses={getReponsesForQuestion(q.id)}
              allQuestions={questions}
              allReponses={reponses}
              resultats={resultats}
              expanded={expandedQuestions}
              onToggle={toggleExpand}
              onEditQuestion={openQuestionDialog}
              onDeleteQuestion={deleteQuestion}
              onToggleActive={toggleQuestionActive}
              onAddReponse={openReponseDialog}
              onEditReponse={openReponseDialog}
              onDeleteReponse={deleteReponse}
              depth={0}
            />
          ))}

          {childQuestions.filter(q => !reponses.some(r => r.next_question_id === q.id)).length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground font-medium">Questions orphelines (non liées)</p>
              {childQuestions.filter(q => !reponses.some(r => r.next_question_id === q.id)).map(q => (
                <QuestionNode
                  key={q.id}
                  question={q}
                  reponses={getReponsesForQuestion(q.id)}
                  allQuestions={questions}
                  allReponses={reponses}
                  resultats={resultats}
                  expanded={expandedQuestions}
                  onToggle={toggleExpand}
                  onEditQuestion={openQuestionDialog}
                  onDeleteQuestion={deleteQuestion}
                  onToggleActive={toggleQuestionActive}
                  onAddReponse={openReponseDialog}
                  onEditReponse={openReponseDialog}
                  onDeleteReponse={deleteReponse}
                  depth={0}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog open={questionDialog.open} onOpenChange={(o) => setQuestionDialog({ open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{questionDialog.question ? 'Modifier la question' : 'Nouvelle question'}</DialogTitle>
            <DialogDescription>Domaine: {domainLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Libellé *</Label>
              <Input value={questionForm.libelle} onChange={e => setQuestionForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Ex: Où se situe votre problème ?" />
            </div>
            <div>
              <Label>Sous-libellé</Label>
              <Input value={questionForm.sous_libelle} onChange={e => setQuestionForm(f => ({ ...f, sous_libelle: e.target.value }))} placeholder="Ex: Indiquez la zone concernée" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={questionForm.est_racine} onCheckedChange={v => setQuestionForm(f => ({ ...f, est_racine: v }))} />
              <Label>Question racine (première question du domaine)</Label>
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={questionForm.display_order} onChange={e => setQuestionForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog({ open: false })}>Annuler</Button>
            <Button onClick={saveQuestion} disabled={!questionForm.libelle.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reponse Dialog */}
      <Dialog open={reponseDialog.open} onOpenChange={(o) => setReponseDialog({ open: o })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{reponseDialog.reponse ? 'Modifier la réponse' : 'Nouvelle réponse'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label *</Label>
              <Input value={reponseForm.label} onChange={e => setReponseForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: WC, Évier, Fuite..." />
            </div>
            <div>
              <Label>Icône</Label>
              <IconPicker value={reponseForm.icone} onChange={v => setReponseForm(f => ({ ...f, icone: v }))} />
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">Destination : choisir <strong>une</strong> des deux options ci-dessous.</p>
            <div>
              <Label>→ Question suivante</Label>
              <Select value={reponseForm.next_question_id} onValueChange={v => setReponseForm(f => ({ ...f, next_question_id: v === 'none' ? '' : v, resultat_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {questions.filter(q => q.id !== reponseDialog.questionId).map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>→ Résultat final</Label>
              <Select value={reponseForm.resultat_id} onValueChange={v => setReponseForm(f => ({ ...f, resultat_id: v === 'none' ? '' : v, next_question_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {resultats.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input type="number" value={reponseForm.display_order} onChange={e => setReponseForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReponseDialog({ open: false })}>Annuler</Button>
            <Button onClick={saveReponse} disabled={!reponseForm.label.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Recursive question node
interface QuestionNodeProps {
  question: DbQuestion;
  reponses: DbReponse[];
  allQuestions: DbQuestion[];
  allReponses: DbReponse[];
  resultats: DbResultat[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEditQuestion: (q: DbQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onToggleActive: (q: DbQuestion) => void;
  onAddReponse: (qId: string) => void;
  onEditReponse: (qId: string, r: DbReponse) => void;
  onDeleteReponse: (id: string) => void;
  depth: number;
}

function QuestionNode({
  question, reponses, allQuestions, allReponses, resultats, expanded, onToggle,
  onEditQuestion, onDeleteQuestion, onToggleActive, onAddReponse, onEditReponse, onDeleteReponse, depth
}: QuestionNodeProps) {
  const isExpanded = expanded.has(question.id);
  const hasReponses = reponses.length > 0;

  return (
    <div className={`border rounded-lg ${!question.is_active ? 'opacity-50' : ''}`} style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-t-lg">
        <button onClick={() => onToggle(question.id)} className="p-0.5">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {question.est_racine && <Badge variant="default" className="text-[10px] px-1.5">Racine</Badge>}
        <span className="font-medium text-sm flex-1 truncate">{question.libelle}</span>
        <Badge variant="outline" className="text-[10px]">{reponses.length} rép.</Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(question)}>
          {question.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditQuestion(question)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteQuestion(question.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-2">
          {question.sous_libelle && <p className="text-xs text-muted-foreground italic">{question.sous_libelle}</p>}

          {reponses.map(r => {
            const nextQ = r.next_question_id ? allQuestions.find(q => q.id === r.next_question_id) : null;
            const resultat = r.resultat_id ? resultats.find(res => res.id === r.resultat_id) : null;

            return (
              <div key={r.id} className="flex items-center gap-2 pl-4 py-1.5 border-l-2 border-primary/20">
                {r.icone && <span className="text-lg">{r.icone}</span>}
                <span className="text-sm flex-1">{r.label}</span>
                {nextQ && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <ArrowRight className="h-3 w-3" /> {nextQ.libelle.slice(0, 30)}…
                  </Badge>
                )}
                {resultat && (
                  <Badge className="text-[10px] gap-1 bg-green-600">
                    <Target className="h-3 w-3" /> {resultat.nom.slice(0, 25)}
                  </Badge>
                )}
                {!nextQ && !resultat && (
                  <Badge variant="destructive" className="text-[10px]">⚠ Sans destination</Badge>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditReponse(question.id, r)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDeleteReponse(r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          <Button variant="outline" size="sm" className="ml-4" onClick={() => onAddReponse(question.id)}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter une réponse
          </Button>

          {/* Render child questions */}
          {reponses.filter(r => r.next_question_id).map(r => {
            const childQ = allQuestions.find(q => q.id === r.next_question_id);
            if (!childQ) return null;
            const childReponses = allReponses.filter(rr => rr.question_id === childQ.id).sort((a, b) => a.display_order - b.display_order);
            return (
              <QuestionNode
                key={childQ.id}
                question={childQ}
                reponses={childReponses}
                allQuestions={allQuestions}
                allReponses={allReponses}
                resultats={resultats}
                expanded={expanded}
                onToggle={onToggle}
                onEditQuestion={onEditQuestion}
                onDeleteQuestion={onDeleteQuestion}
                onToggleActive={onToggleActive}
                onAddReponse={onAddReponse}
                onEditReponse={onEditReponse}
                onDeleteReponse={onDeleteReponse}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
