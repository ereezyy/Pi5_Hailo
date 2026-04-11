## 2024-04-11 - [Supabase N+1 Queries]
**Learning:** React components (e.g., `ResultsViewer.tsx`) suffer from N+1 query bottlenecks when loading related records (like `inference_tasks` for each `inference_result`). Iterating through results and executing sequential `supabase.from().select().eq()` queries blocks rendering and wastes network requests.
**Action:** Always use Supabase's joined query syntax (e.g., `.select('*, foreign_table(*)')`) to fetch relational data in a single network request.
