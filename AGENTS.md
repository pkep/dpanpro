# Architecture rules

- Register each cross-backend domain service in `src/services/factory.ts` behind a shared interface, so Supabase and Spring modes expose the same contract.
- Keep reusable client-name, map-filter, status-transition and technician-availability helpers in `src/lib` so views can share domain rules without making service calls.
- Keep intervention editing and map-marker helpers in `src/lib`, with their supplied catalog and constants under `src/components/ClientInterface/InterventionSteps`, so uploaded helpers retain compatible imports.
- Serve the default technician avatar from `public/avatars/technician-default.svg` through the shared avatar helper so missing photos have a working local fallback.
