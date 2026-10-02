# Architecture rules

- Register each cross-backend domain service in `src/services/factory.ts` behind a shared interface, so Supabase and Spring modes expose the same contract.
