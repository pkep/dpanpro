import type { QuestionnaireDomain } from '@/data/questionnaire-tree';

export interface IQuestionnaireService {
  getQuestionnaireTree(): Promise<Record<string, QuestionnaireDomain>>;
  clearCache(): void;
}
