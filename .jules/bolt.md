## 2024-04-11 - [Supabase N+1 Queries]
**Learning:** React components (e.g., `ResultsViewer.tsx`) suffer from N+1 query bottlenecks when loading related records (like `inference_tasks` for each `inference_result`). Iterating through results and executing sequential `supabase.from().select().eq()` queries blocks rendering and wastes network requests.
**Action:** Always use Supabase's joined query syntax (e.g., `.select('*, foreign_table(*)')`) to fetch relational data in a single network request.

## 2024-05-24 - [Supabase N+1 Queries in Component Iteration]
**Learning:** Components that render lists of entities (like `models` in `ModelAnalytics` or `ModelBenchmark`) often introduce N+1 query bottlenecks when they iterate through the list and execute separate `supabase.from().select()` queries for each entity's related data. This scales poorly and blocks rendering.
**Action:** Always batch related data queries using `.in('foreign_key_id', entities.map(e => e.id))` to fetch all related records in a single query, then group them in memory by the foreign key to associate them back to the original entities. This reduces network roundtrips from O(N) to O(1).

## 2024-05-25 - [Supabase Nested Loop Avoidance]
**Learning:** `ExportReports.tsx` had an extreme case of N+1 queries where it iterated over a list of `models`, doing *two* separate queries per model. The second query could actually be completely skipped by extracting its logic into the first data aggregation pass.
**Action:** When refactoring O(N) queries into a single `.in()` query, look for other query blocks in the same logical boundary that can be consolidated into the new grouped, in-memory processing loop to save network round-trips.
## 2024-05-25 - [O(N^2) Array lookups in component iterations]
**Learning:** In the frontend, using `Array.find()` inside loop iterators (like mapping lists to DOM elements or mapping API results) creates hidden O(N*M) bottlenecks.
**Action:** Always pre-compute a lookup `Map` with `new Map(items.map(i => [i.id, i]))`, turning the O(N) iteration search into an O(1) key lookup. Use `useMemo` when this happens in a component render to ensure it isn't rebuilt unnecessarily.

## 2024-05-25 - [Redundant DB Operations & Sequential Awaits]
**Learning:** During batch processing or task execution, the codebase often executes an `INSERT` to create a 'pending' task, immediately followed by an `UPDATE` to mark it 'processing'—wasting a full network roundtrip per loop iteration. Furthermore, when completing a task, `inference_results` `INSERT` and `inference_tasks` `UPDATE` are awaited sequentially, doubling the latency.
**Action:** Always initialize database rows with their immediate target state when inserting (e.g., `status: 'processing'`) if processing begins synchronously. Additionally, use `Promise.all()` to parallelize independent database write operations (like inserting results and updating task status) to halve the network wait time.

## 2024-05-25 - [O(N^2) Getter Recomputations in Render Loops]
**Learning:** Components that render many DOM elements (like points in a Heatmap) and use unmemoized getter functions (e.g., `getIntensityColor` calling `getMaxIntensity()`) inside their map iterations suffer from massive O(N^2) bottlenecks if those getters filter or map over the data array.
**Action:** Always pre-calculate array-wide maximums or filtered views using `useMemo` at the component level, and use `useCallback` or pass these computed values down directly so they aren't recalculated per element.

## 2024-05-25 - [O(N) Reductions in Render Loops]
**Learning:** Components that render lists of elements (like mapping API results to cards) and perform `.reduce()` or other O(N) array calculations (e.g. averaging confidence scores) on each item directly within the render return block will recalculate these values on every render cycle.
**Action:** Use `React.useMemo` to pre-calculate and attach these derived values (like `avgConfidence` and `detections`) to the data items when the data (or filter state) changes, so the render loop only accesses pre-computed primitives.
