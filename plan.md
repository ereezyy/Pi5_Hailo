1.  **Frontend Performance Issue Identified:** The `ResultsViewer` component recalculates `filteredResults` inside a `useEffect` based on `filters` and `results`.  Furthermore, it calculates `avgConfidence` for each filtered result in the `.filter` inside `applyFilters` AND AGAIN inside the `.map` render loop. This leads to redundant recalculations and potential re-renders. A better approach is to use `useMemo` to compute the `filteredResults` derived state, avoiding unnecessary `useEffect` updates and component re-renders. It also simplifies the `avgConfidence` calculation by pre-calculating or avoiding the double calculation.

2.  **Proposed Fix in `src/components/ResultsViewer.tsx`:**
    *   Remove `filteredResults` from `useState`.
    *   Remove `setFilteredResults` calls.
    *   Remove `useEffect` dependency on `[filters, results]`.
    *   Refactor `applyFilters` into a `useMemo` block that derives `filteredResults` directly from `results` and `filters`.
    *   Keep the inline `avgConfidence` calculation in the render function (or optimize it within the object, but simple mapping is usually fast enough if the list size is small; but moving `filteredResults` to `useMemo` is a significant architectural optimization).

    Wait, the `avgConfidence` calculation inside the `.filter` callback inside `applyFilters` is:
    ```typescript
    const avgConfidence = Array.isArray(r.confidence_scores)
      ? r.confidence_scores.reduce((a: number, b: number) => a + b, 0) / r.confidence_scores.length
      : 0;
    ```
    And then it's calculated AGAIN during the `.map` inside the render function.
    ```typescript
    const avgConfidence = Array.isArray(result.confidence_scores)
      ? result.confidence_scores.reduce((a: number, b: number) => a + b, 0) / result.confidence_scores.length
      : 0;
    ```

    We can optimize this by enriching the result objects with `detections` and `avgConfidence` during the `useMemo` step so it's calculated exactly once when inputs or filters change, instead of twice per render (once in effect, once in render).

3.  **Refactoring:**
    ```tsx
    const enrichedResults = useMemo(() => {
        return results.map(r => {
            const detections = Array.isArray(r.result_data) ? r.result_data : [];
            const avgConfidence = Array.isArray(r.confidence_scores) && r.confidence_scores.length > 0
                ? r.confidence_scores.reduce((a: number, b: number) => a + b, 0) / r.confidence_scores.length
                : 0;
            return { ...r, detections, avgConfidence };
        });
    }, [results]);

    const filteredResults = useMemo(() => {
        let filtered = enrichedResults;

        if (filters.searchTerm) {
          filtered = filtered.filter(r =>
            r.task.task_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
          );
        }

        return filtered.filter(r => {
          return (
            r.avgConfidence >= filters.minConfidence &&
            r.processing_time_ms <= filters.maxProcessingTime &&
            r.detections.length >= filters.minDetections
          );
        });
    }, [enrichedResults, filters]);
    ```

    This perfectly embodies Bolt's memoization and derived state optimization.

4.  **Steps:**
    1. Check `src/components/ResultsViewer.tsx` to identify the `useEffect` and `useState` corresponding to `filteredResults`.
    2. Replace with `useMemo`.
    3. Remove `applyFilters` and the `useEffect` calling it.
    4. Remove `filteredResults` from state.
    5. Update render logic to use `filteredResults` array and its precomputed `avgConfidence` and `detections`.
    6. Complete pre-commit check.
    7. Commit.
