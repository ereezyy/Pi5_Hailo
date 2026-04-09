# Optimization Rationale: N+1 Query in Model Benchmark

## Issue
The `ModelBenchmark` component previously implemented an N+1 query pattern when running benchmarks for multiple models. For each model in the `modelsToTest` array, a separate asynchronous call was made to Supabase to fetch its `inference_tasks`.

```typescript
for (const model of modelsToTest) {
  const { data: tasks } = await supabase
    .from('inference_tasks')
    .select(...)
    .eq('model_id', model.id);
  // ... processing
}
```

This resulted in $O(N)$ network requests, where $N$ is the number of models. In environments with network latency, this significantly increases the total time to run the benchmark.

## Optimization
The optimization replaces the iterative fetching with a single batch query using the `.in()` filter.

```typescript
const { data: allTasks } = await supabase
  .from('inference_tasks')
  .select(`
    model_id,
    id,
    status,
    inference_results (
      processing_time_ms
    )
  `)
  .in('model_id', modelsToTest.map(m => m.id));
```

The fetched tasks are then filtered in memory for each model during the calculation phase.

## Impact
- **Network Requests:** Reduced from $N$ to 1.
- **Latency:** Total latency is reduced from $O(N \times \text{latency})$ to $O(1 \times \text{latency} + \text{in-memory processing})$.
- **Database Load:** Reduces the overhead of multiple query executions on the database server.
