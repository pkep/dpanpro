# Architecture rules

- Register each cross-backend domain service in `src/services/factory.ts` behind a shared interface, so Supabase and Spring modes expose the same contract.
- Keep reusable client-name, map-filter, status-transition and technician-availability helpers in `src/lib` so views can share domain rules without making service calls.
- Keep intervention editing and map-marker helpers in `src/lib`, with their supplied catalog and constants under `src/components/ClientInterface/InterventionSteps`, so uploaded helpers retain compatible imports.
- Serve the default technician avatar from `public/avatars/technician-default.svg` through the shared avatar helper so missing photos have a working local fallback.
- Treat intervention suspension as a boolean independent of operational status so suspension preserves the intervention's progress.
- Preserve PDF download, attachment and archive methods when updating document renderers so existing callers remain compatible.
- Keep Edge Function client-name resolution under `supabase/functions/_shared` aligned with the frontend helper, because deployment cannot import files from `src`.
