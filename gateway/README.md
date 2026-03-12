# Gateway Spring Boot

Ce dossier contiendra le backend Spring Boot (Java 21).

## Structure attendue

```
gateway/
├── src/main/java/com/depanpro/
│   ├── auth/          # Authentification JWT
│   ├── users/         # Gestion utilisateurs
│   ├── interventions/ # Interventions
│   ├── dispatch/      # Algorithme de dispatch
│   ├── messages/      # Messagerie
│   ├── payment/       # Stripe
│   ├── schedule/      # Planning techniciens
│   ├── statistics/    # Statistiques & KPIs
│   ├── photos/        # Photos d'intervention
│   ├── ratings/       # Évaluations
│   ├── quotes/        # Devis
│   ├── notifications/ # Email + Push
│   ├── technicians/   # Profils techniciens
│   ├── settings/      # Paramètres site
│   ├── security/      # JWT + Spring Security
│   └── config/        # Swagger, CORS, error handler
├── src/main/resources/
│   ├── db/migration/  # Flyway (V1 schema + V2 seed)
│   └── templates/email/
├── Dockerfile
└── pom.xml
```

## Build & Run

```bash
mvn spring-boot:run
```

## Docker

```bash
docker build -t depanpro-gateway .
```
