# 🔧 Dépan.Pro — Plateforme de Dépannage

> Plateforme de mise en relation clients / techniciens dépannage.
> Stack : React (Vite + TypeScript) + Spring Boot 3 (Java 21) + PostgreSQL + Docker

---

## 📁 Structure du projet

```
depanpro/
├── frontend/          # Application React (Vite + TypeScript + Tailwind) — Lovable
│   ├── src/
│   │   ├── components/    # Composants UI (admin, client, technician, map…)
│   │   ├── pages/         # Pages par rôle (admin, client, technician, manager)
│   │   ├── services/      # Couche d'abstraction Supabase / Spring
│   │   │   ├── interfaces/    # Contrats de service
│   │   │   ├── supabase/      # Implémentations Supabase (Lovable Cloud)
│   │   │   ├── spring/        # Implémentations REST Spring Boot
│   │   │   └── factory.ts     # Factory de switch Supabase ↔ Spring
│   │   ├── hooks/         # Hooks React (auth, realtime, geolocation…)
│   │   └── config/        # Configuration API (api.config.ts)
│   ├── Dockerfile         # Multi-stage Node → Nginx
│   ├── nginx.conf         # Reverse proxy + SPA fallback
│   └── package.json
├── gateway/           # API Spring Boot (remplace Supabase)
│   ├── src/main/java/com/depanpro/
│   │   ├── auth/          # Authentification JWT
│   │   ├── users/         # Gestion utilisateurs
│   │   ├── interventions/ # Interventions CRUD + workflow
│   │   ├── dispatch/      # Algorithme de dispatch intelligent
│   │   ├── messages/      # Messagerie temps réel
│   │   ├── payment/       # Stripe (pré-autorisation, capture)
│   │   ├── schedule/      # Planning techniciens
│   │   ├── statistics/    # Statistiques & KPIs
│   │   ├── photos/        # Photos d'intervention
│   │   ├── ratings/       # Évaluations
│   │   ├── quotes/        # Devis & signatures
│   │   ├── notifications/ # Email (Thymeleaf) + Push (FCM)
│   │   ├── technicians/   # Profils techniciens
│   │   ├── settings/      # Paramètres site
│   │   ├── security/      # JWT + Spring Security
│   │   └── config/        # Swagger, CORS, global error handler
│   └── src/main/resources/
│       ├── db/migration/  # Flyway (V1 schema + V2 seed)
│       └── templates/email/ # Templates Thymeleaf
├── monitoring/
│   ├── prometheus/    # Configuration Prometheus
│   └── grafana/       # Dashboards Grafana pré-provisionnés
├── docs/
│   ├── sequences/     # Diagrammes de séquence (Mermaid)
│   └── functional/    # Documentation fonctionnelle
├── postman/           # Collection Postman (92 requêtes)
├── .env.example       # Variables d'environnement
└── docker-compose.yml # Orchestration complète
```

---

## 🚀 Démarrage rapide

### Prérequis
- Java 21+, Maven 3.9+
- Node.js 20+
- Docker & Docker Compose

### Avec Docker (recommandé)

```bash
# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (Stripe, SMTP, JWT…)

# Lancer tous les services
docker-compose up -d

# URLs disponibles :
# Frontend    → http://localhost:3000
# Gateway API → http://localhost:8080/api
# Swagger UI  → http://localhost:8080/api/swagger-ui.html
# Prometheus  → http://localhost:9090
# Grafana     → http://localhost:3001 (admin/depanpro123)
```

### Développement local

```bash
# Backend Spring
cd gateway
mvn spring-boot:run

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

### Mode Lovable Cloud (sans Docker)

Le frontend fonctionne aussi en mode Lovable Cloud (Supabase) par défaut. Pour basculer vers Spring Boot :

```env
VITE_API_MODE=spring
VITE_SPRING_API_URL=http://localhost:8080/api
```

---

## 🔐 Comptes de test (seed V2)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@depan-pro.com` | `Password123!` | Admin |
| `manager@depan-pro.com` | `Password123!` | Manager |
| `tech1@depan-pro.com` | `Password123!` | Technicien |
| `tech2@depan-pro.com` | `Password123!` | Technicien (entreprise) |
| `client1@example.com` | `Password123!` | Client particulier |
| `client2@example.com` | `Password123!` | Client professionnel |

---

## 📚 Documentation

| Ressource | URL |
|-----------|-----|
| Swagger UI | http://localhost:8080/api/swagger-ui.html |
| API Docs JSON | http://localhost:8080/api/api-docs |
| Actuator Health | http://localhost:8080/api/actuator/health |
| Prometheus Metrics | http://localhost:8080/api/actuator/prometheus |
| Grafana | http://localhost:3001 |

---

## 🧪 Tests

```bash
cd gateway
# Tous les tests (nécessite Docker pour Testcontainers)
mvn test

# Tests unitaires uniquement
mvn test -Dtest="*ServiceTest"

# Tests d'intégration
mvn test -Dtest="*ControllerTest"
```

---

## 🗄️ Base de données

**Migrations Flyway** dans `gateway/src/main/resources/db/migration/` :

| Fichier | Description |
|---------|-------------|
| `V1__initial_schema.sql` | Schéma complet (31 tables) |
| `V2__seed_data.sql` | Données de test (tous types d'utilisateurs) |

---

## 🔄 Architecture multi-backend

Le frontend utilise une couche d'abstraction (`src/services/`) permettant de basculer entre deux backends :

| Aspect | Supabase (Lovable Cloud) | Spring Boot (Gateway) |
|--------|--------------------------|----------------------|
| Auth | Supabase Auth + Edge Functions | JWT personnalisé (BCrypt) |
| Base de données | Supabase Postgres + RLS | PostgreSQL + Spring Data JPA |
| Fonctions serveur | Edge Functions (Deno) | Contrôleurs Spring REST |
| Temps réel | Supabase Realtime | WebSocket STOMP |
| Stockage | Supabase Storage | Local FS ou AWS S3 |
| Emails | Edge Functions | Spring Mail + Thymeleaf |

Le switch se fait via `VITE_API_MODE` (`supabase` ou `spring`) dans la factory (`src/services/factory.ts`).

---

## 📊 Monitoring

```
Prometheus scrape : /api/actuator/prometheus (toutes les 10s)
Métriques exposées : HTTP requests, JVM, HikariCP, business KPIs
Grafana : dashboards pré-configurés via provisioning
```

---

## 🏗️ Architecture technique

```
Client HTTP ──► Nginx (:3000)
                   │
                   ├── Static files (React SPA)
                   └── /api/ ──► Gateway (Spring Boot :8080)
                                     │
                                     ├── Spring Security (JWT)
                                     ├── Spring Data JPA
                                     │       └── PostgreSQL :5432
                                     │               └── Flyway migrations
                                     ├── Spring Mail + Thymeleaf (emails)
                                     ├── WebSocket STOMP (realtime)
                                     └── Actuator → Prometheus → Grafana
```

---

## 🔧 Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/depanpro` | URL PostgreSQL |
| `DB_USER` | `depanpro` | Utilisateur DB |
| `DB_PASSWORD` | `depanpro` | Mot de passe DB |
| `JWT_SECRET` | (voir config) | Secret JWT (min 256 bits) |
| `MAIL_HOST` | `smtp.gmail.com` | Serveur SMTP |
| `MAIL_USER` | `contact@depan-pro.com` | Expéditeur email |
| `MAIL_PASSWORD` | — | Mot de passe SMTP |
| `STRIPE_API_KEY` | — | Clé secrète Stripe |
| `GRAFANA_PASSWORD` | `depanpro123` | Mot de passe admin Grafana |
| `VITE_API_MODE` | `supabase` | Mode API (`supabase` ou `spring`) |
| `VITE_SPRING_API_URL` | `http://localhost:8080/api` | URL du gateway Spring |
