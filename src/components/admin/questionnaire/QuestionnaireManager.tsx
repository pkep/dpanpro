import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="space-y-4">

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
