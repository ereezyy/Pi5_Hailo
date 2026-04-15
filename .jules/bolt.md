## 2024-04-11 - [Supabase N+1 Queries]
**Learning:** React components (e.g., `ResultsViewer.tsx`) suffer from N+1 query bottlenecks when loading related records (like `inference_tasks` for each `inference_result`). Iterating through results and executing sequential `supabase.from().select().eq()` queries blocks rendering and wastes network requests.
**Action:** Always use Supabase's joined query syntax (e.g., `.select('*, foreign_table(*)')`) to fetch relational data in a single network request.

## 2024-05-24 - [Supabase N+1 Queries in Component Iteration]
**Learning:** Components that render lists of entities (like `models` in `ModelAnalytics` or `ModelBenchmark`) often introduce N+1 query bottlenecks when they iterate through the list and execute separate `supabase.from().select()` queries for each entity's related data. This scales poorly and blocks rendering.
**Action:** Always batch related data queries using `.in('foreign_key_id', entities.map(e => e.id))` to fetch all related records in a single query, then group them in memory by the foreign key to associate them back to the original entities. This reduces network roundtrips from O(N) to O(1).

## 2024-05-18 - React Array Reduction in Render Loop
**Learning:** Performing `O(N)` `.reduce()` or `.filter()` operations on arrays inside the `map` render loop of lists, especially combined with stateful components updating on text input, causes significant visual latency.
**Action:** Always compute derived aggregation state (like counts, averages) using `useMemo` outside of the render loop mapping to prevent unnecessary recalculations on unrelated state changes (like typing in a search bar or text input).

## 2024-05-18 - Nested Loop React Lookups
**Learning:** Calling `Array.prototype.find()` inside an `Array.prototype.map()` during a React render causes an `O(N*M)` performance trap, which is particularly devastating for form inputs since the entire loop re-runs on every keystroke.
**Action:** Pre-compute a `Map` using `useMemo` for any related reference data that needs to be accessed inside a list mapping to convert `O(N*M)` render costs to `O(N)` with `O(1)` lookups.
