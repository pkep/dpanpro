# Architecture rules

- Register each cross-backend domain service in `src/services/factory.ts` behind a shared interface, so Supabase and Spring modes expose the same contract.
- Keep reusable client-name, map-filter, status-transition and technician-availability helpers in `src/lib` so views can share domain rules without making service calls.
