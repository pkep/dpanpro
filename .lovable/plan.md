# Intégration des services B2B

## Modifications
- Ajouter l’interface B2B fournie aux interfaces de services et à leur export commun.
- Ajouter les implémentations B2B fournies pour les modes Lovable Cloud et Spring.
- Raccorder `b2b` à la factory afin qu’elle sélectionne automatiquement la bonne implémentation selon le mode actif.
- Vérifier la compilation et corriger uniquement les incompatibilités directement liées à ces trois fichiers.

## Détails techniques
- Nouveaux fichiers : `b2b.interface.ts`, `b2b.service.ts`, `b2b.spring.ts`.
- Nouvelle propriété `b2b: IB2bService` dans le conteneur de services.
- Aucun changement de base de données ni d’écran.
