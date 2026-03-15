# Collection Postman — Depan.Pro Gateway API v2

Collection complète synchronisée avec `docs/openapi-spec.yaml`.

## Import

1. Ouvrir Postman
2. Importer le fichier `depanpro-api.postman_collection.json`
3. La variable `baseUrl` est pré-configurée sur `http://localhost:8080/api`

## Variables de collection

| Variable | Description | Valeur par défaut |
|---|---|---|
| `baseUrl` | URL de base de l'API | `http://localhost:8080/api` |
| `accessToken` | Token JWT (auto-rempli après Login) | — |
| `refreshToken` | Refresh token (auto-rempli après Login) | — |
| `userId` | ID utilisateur courant (auto-rempli après Login) | — |
| `interventionId` | ID intervention de test | `20000000-...` |
| `technicianId` | ID technicien de test | `00000000-...` |
| `serviceId` | ID service de test | `10000000-...` |

## Utilisation

1. **Login** — Exécuter un des endpoints `Login (admin/client/technician)` pour remplir automatiquement `accessToken`, `refreshToken` et `userId`
2. L'auth Bearer est configurée au niveau de la collection — tous les endpoints authentifiés l'héritent automatiquement
3. Les endpoints publics ont `auth: noauth` pour ne pas envoyer le token

## Sections couvertes

Auth · Users · Roles · Interventions · History · Dispatch · Quotes · Quote Modifications · Services · Technicians · Partners · Ratings · Messages · Photos · Work Photos · Payment · Cancellation · Schedule · Revenue · Payouts · Disputes · Statistics · Performance · Configuration · Pricing · Settings · Notifications · Storage · Geocoding · Questionnaire · Invoice · Health
