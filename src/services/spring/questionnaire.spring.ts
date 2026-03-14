import type { IQuestionnaireService } from '@/services/interfaces/questionnaire.interface';
import type { QuestionnaireDomain } from '@/data/questionnaire-tree';
import { springHttp } from './http-client';

export class SpringQuestionnaireService implements IQuestionnaireService {
  private cache: Record<string, QuestionnaireDomain> | null = null;

  // GET /questionnaire/tree
  async getQuestionnaireTree(): Promise<Record<string, QuestionnaireDomain>> {
    if (this.cache) return this.cache;
    const tree = await springHttp.get<Record<string, QuestionnaireDomain>>('/questionnaire/tree');
    this.cache = tree;
    return tree;
  }

  clearCache(): void {
    this.cache = null;
  }
}
