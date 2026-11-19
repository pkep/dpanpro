/**
 * Contrat du service partenaires « léger » (src/services/supabase/partners-service.ts) :
 * lecture simple des candidatures.
 *
 * Le contrat complet (administration, qualification, statistiques) est déclaré
 * dans `@/services/interfaces/partners.interface` et sert aux services
 * `partners.service.ts` / `partners.spring.ts`.
 */
export interface IPartnersService {
  getPartnerApplication(userId: string): Promise<unknown>;
  searchPartners(query?: string): Promise<unknown[]>;
}
