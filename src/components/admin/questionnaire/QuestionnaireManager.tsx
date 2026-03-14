import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Loader2 } from 'lucide-react';
import { questionnaireService } from '@/services/components/questionnaire/questionnaire.service';
import { DomainTab } from './DomainTab';
import { ResultatsManager } from './ResultatsManager';

interface Domain {
  code: string;
  label: string;
  icon: string;
}

const DOMAINS: Domain[] = [
  { code: 'plumbing', label: 'Plomberie', icon: '💧' },
  { code: 'electricity', label: 'Électricité', icon: '⚡' },
  { code: 'locksmith', label: 'Serrurerie', icon: '🔑' },
  { code: 'glazing', label: 'Vitrerie', icon: '🪟' },
  { code: 'heating', label: 'Chauffage', icon: '🔥' },
  { code: 'aircon', label: 'Climatisation', icon: '❄️' },
];

export function QuestionnaireManager() {
  const [activeDomain, setActiveDomain] = useState(DOMAINS[0].code);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    questionnaireService.clearCache();
    toast.success('Cache du questionnaire vidé');
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshCache} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Vider le cache
          </Button>
        </div>
      </div>

      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {DOMAINS.map(d => (
            <TabsTrigger key={d.code} value={d.code} className="gap-1">
              <span>{d.icon}</span> {d.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="resultats" className="gap-1">
            📊 Résultats
          </TabsTrigger>
        </TabsList>

        {DOMAINS.map(d => (
          <TabsContent key={d.code} value={d.code}>
            <DomainTab domainCode={d.code} domainLabel={d.label} domainIcon={d.icon} />
          </TabsContent>
        ))}

        <TabsContent value="resultats">
          <ResultatsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
