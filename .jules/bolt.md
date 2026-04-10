## 2025-01-25 - Fix N+1 Query in ResultsViewer
**Learning:** React components were using `Promise.all` inside `map` loops to query related Supabase records (e.g. `inference_tasks` for `inference_results`), resulting in severe N+1 query bottlenecks.
**Action:** Always use Supabase's joined query syntax (`select('*, foreign_table(*)')`) to fetch relational data in a single round-trip.
