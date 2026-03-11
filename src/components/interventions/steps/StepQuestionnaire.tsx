import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, Shield, AlertTriangle, Camera, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InterventionCategory } from '@/types/intervention.types';
import { 
  QuestionnaireNode, 
  QuestionnaireOption, 
  QuestionnaireResult, 
  QuestionnaireDomain 
} from '@/data/questionnaire-tree';
import { questionnaireService } from '@/services/components/questionnaire/questionnaire.service';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { storageService } from '@/services/components/utils/storage/storage.service';
import { toast } from 'sonner';

interface HistoryEntry {
  answer: string;
  node: QuestionnaireNode;
}

interface StepQuestionnaireProps {
  category: InterventionCategory;
  onResult: (result: QuestionnaireResult, answers: string[]) => void;
  onResultClear?: () => void;
  selectedResult: QuestionnaireResult | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const TIER_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  mid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  xhigh: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function StepQuestionnaire({
  category,
  onResult,
  onResultClear,
  selectedResult,
  description,
  onDescriptionChange,
  photos,
  onPhotosChange,
}: StepQuestionnaireProps) {
  const [domain, setDomain] = useState<QuestionnaireDomain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentNode, setCurrentNode] = useState<QuestionnaireNode | null>(null);
  const [result, setResult] = useState<QuestionnaireResult | null>(selectedResult);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load questionnaire from DB
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const tree = await questionnaireService.getQuestionnaireTree();
        if (cancelled) return;
        const d = tree[category] || null;
        setDomain(d);
        setCurrentNode(d);
      } catch (error) {
        console.error('Error loading questionnaire:', error);
        toast.error('Erreur lors du chargement du questionnaire');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [category]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Chargement du questionnaire...</p>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Questionnaire non disponible pour cette catégorie.</p>
      </div>
    );
  }

  const handleSelectOption = (option: QuestionnaireOption) => {
    const newAnswers = [...answers, option.label];
    setAnswers(newAnswers);

    // Always save current node to history before navigating
    const newHistory = [...history, { answer: option.label, node: currentNode! }];
    setHistory(newHistory);

    if (option.result) {
      setResult(option.result);
      setCurrentNode(null);
      onResult(option.result, newAnswers);
    } else if (option.next) {
      setCurrentNode(option.next);
    }
  };

  const handleGoBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentNode(prev.node);
      setAnswers(answers.slice(0, -1));
      setResult(null);
    }
  };


  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newPhotos: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error('Seules les images sont acceptées');
          continue;
        }
        const publicUrl = await storageService.uploadFile('intervention-photos', file, 'temp');
        newPhotos.push(publicUrl);
      }
      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
        toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erreur lors du téléchargement des photos');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const handleGoBackFromResult = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentNode(prev.node);
      setAnswers(answers.slice(0, -1));
    } else {
      setCurrentNode(domain);
      setAnswers([]);
    }
    setResult(null);
    onResultClear?.();
  };

  const handleReset = () => {
    setHistory([]);
    setCurrentNode(domain);
    setResult(null);
    setAnswers([]);
    onResultClear?.();
  };

  // Show result card
  if (result) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button onClick={handleReset} className="text-primary hover:underline font-medium">
            {domain.icon} {domain.label}
          </button>
          {answers.map((a, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">›</span>
              <span className="text-muted-foreground">{a}</span>
            </span>
          ))}
        </div>

        {/* Back one step */}
        <Button variant="ghost" size="sm" onClick={handleGoBackFromResult}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>

        {/* Result Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">✓ Résultat</Badge>
            </div>
            <h3 className="text-xl font-bold">{result.nom}</h3>
            <p className="text-muted-foreground">{result.desc}</p>

            <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-bold', TIER_COLORS[result.tier])}>
              {result.prix} <span className="text-sm font-normal">TTC</span>
            </div>

            {/* Variantes */}
            {result.variantes && result.variantes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Variantes tarifées</p>
                <div className="space-y-1">
                  {result.variantes.map(([name, price], i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-background">
                      <span>{name}</span>
                      <span className="font-medium">{price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta tags */}
            {result.meta && (
              <div className="flex flex-wrap gap-2 pt-2">
                {result.meta.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {m.includes('Urgence') && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {m.includes('Garantie') && <Shield className="h-3 w-3 mr-1" />}
                    {(m.includes('min') || m.includes('h') || m.includes('journée')) && <Clock className="h-3 w-3 mr-1" />}
                    {m}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Description complémentaire */}
        <div>
          <Label htmlFor="description">Informations complémentaires (optionnel)</Label>
          <Textarea
            id="description"
            placeholder="Décrivez votre situation en détail (circonstances, urgence, accès au lieu...)"
            className="min-h-[100px] mt-2"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>

        {/* Photos */}
        <div>
          <Label>Photos (optionnel)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Ajoutez des photos pour aider le technicien
          </p>
          <div className="flex gap-2 mb-4">
            <Button type="button" variant="outline" disabled={isUploading} size="sm"
              onClick={() => document.getElementById('q-photo-upload')?.click()}>
              <Upload className="h-4 w-4 mr-2" />Galerie
            </Button>
            <Button type="button" variant="outline" disabled={isUploading} size="sm"
              onClick={() => (document.getElementById('q-photo-capture') as HTMLInputElement)?.click()}>
              <Camera className="h-4 w-4 mr-2" />Photo
            </Button>
          </div>
          <input type="file" id="q-photo-upload" className="hidden" accept="image/*" multiple
            onChange={(e) => handleFileUpload(e.target.files)} />
          <input type="file" id="q-photo-capture" className="hidden" accept="image/*" capture
            onChange={(e) => handleFileUpload(e.target.files)} />
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                  <button type="button" onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" onClick={handleReset} className="w-full">
          ↩ Modifier ma sélection
        </Button>
      </div>
    );
  }

  // Show question
  if (!currentNode) return null;

  const stepNumber = history.length + 1;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button onClick={handleReset} className="text-primary hover:underline font-medium">
            {domain.icon} {domain.label}
          </button>
          {answers.map((a, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">›</span>
              <span className="text-muted-foreground">{a}</span>
            </span>
          ))}
        </div>
      )}

      {/* Back button */}
      {history.length > 0 && (
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      )}

      {/* Question */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">Étape {stepNumber}</p>
        <h2 className="text-xl font-bold">{currentNode.question}</h2>
        {currentNode.sub && (
          <p className="text-muted-foreground mt-1 text-sm">{currentNode.sub}</p>
        )}
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentNode.options.map((option, index) => (
          <Card
            key={index}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]"
            onClick={() => handleSelectOption(option)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              {option.icon && (
                <span className="text-2xl flex-shrink-0">{option.icon}</span>
              )}
              <span className="font-medium text-sm">{option.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
