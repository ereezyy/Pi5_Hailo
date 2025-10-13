import { useState, useEffect } from 'react';
import { Eye, Download, Clock, Target, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type InferenceResult = Database['public']['Tables']['inference_results']['Row'];
type InferenceTask = Database['public']['Tables']['inference_tasks']['Row'];

interface ResultWithTask extends InferenceResult {
  task: InferenceTask;
}

export function ResultsViewer() {
  const [results, setResults] = useState<ResultWithTask[]>([]);
  const [filteredResults, setFilteredResults] = useState<ResultWithTask[]>([]);
  const [selectedResult, setSelectedResult] = useState<ResultWithTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minConfidence: 0,
    maxProcessingTime: 1000,
    minDetections: 0,
    searchTerm: '',
  });

  useEffect(() => {
    loadResults();

    const subscription = supabase
      .channel('results-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inference_results' },
        () => {
          loadResults();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadResults = async () => {
    const { data: resultsData, error } = await supabase
      .from('inference_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && resultsData) {
      const resultsWithTasks = await Promise.all(
        resultsData.map(async (result) => {
          const { data: task } = await supabase
            .from('inference_tasks')
            .select('*')
            .eq('id', result.task_id)
            .single();

          return { ...result, task: task! };
        })
      );

      const filtered = resultsWithTasks.filter(r => r.task);
      setResults(filtered);
      setFilteredResults(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, results]);

  const applyFilters = () => {
    let filtered = [...results];

    if (filters.searchTerm) {
      filtered = filtered.filter(r =>
        r.task.task_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    filtered = filtered.filter(r => {
      const detections = Array.isArray(r.result_data) ? r.result_data : [];
      const avgConfidence = Array.isArray(r.confidence_scores)
        ? r.confidence_scores.reduce((a: number, b: number) => a + b, 0) / r.confidence_scores.length
        : 0;

      return (
        avgConfidence >= filters.minConfidence &&
        r.processing_time_ms <= filters.maxProcessingTime &&
        detections.length >= filters.minDetections
      );
    });

    setFilteredResults(filtered);
  };

  const resetFilters = () => {
    setFilters({
      minConfidence: 0,
      maxProcessingTime: 1000,
      minDetections: 0,
      searchTerm: '',
    });
  };

  const exportResult = (result: ResultWithTask) => {
    const exportData = {
      task_name: result.task.task_name,
      timestamp: result.created_at,
      processing_time_ms: result.processing_time_ms,
      results: result.result_data,
      confidence_scores: result.confidence_scores,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inference_result_${result.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
        <div className="text-slate-400">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Inference Results</h2>
          <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
            {filteredResults.length} of {results.length}
          </span>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Filter Results</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Search by name
              </label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                placeholder="Search tasks..."
                className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Min Confidence: {(filters.minConfidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filters.minConfidence}
                onChange={(e) => setFilters({ ...filters, minConfidence: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Max Processing Time: {filters.maxProcessingTime}ms
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={filters.maxProcessingTime}
                onChange={(e) => setFilters({ ...filters, maxProcessingTime: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Min Detections: {filters.minDetections}
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={filters.minDetections}
                onChange={(e) => setFilters({ ...filters, minDetections: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {filteredResults.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No results yet. Run some inference tasks to see results here.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => {
            const detections = Array.isArray(result.result_data) ? result.result_data : [];
            const avgConfidence = Array.isArray(result.confidence_scores)
              ? result.confidence_scores.reduce((a: number, b: number) => a + b, 0) / result.confidence_scores.length
              : 0;

            return (
              <div
                key={result.id}
                className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-medium mb-1">{result.task.task_name}</div>
                    <div className="text-sm text-slate-400">
                      {new Date(result.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedResult(selectedResult?.id === result.id ? null : result)}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportResult(result)}
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                      title="Export result"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{result.processing_time_ms}ms</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{detections.length} detections</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400">Avg confidence: </span>
                    <span className="text-emerald-400 font-medium">
                      {(avgConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {selectedResult?.id === result.id && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="space-y-2">
                      {detections.map((detection: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-600/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium capitalize">
                              {detection.class}
                            </span>
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm">
                              {(detection.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          {detection.bbox && (
                            <div className="text-xs text-slate-400">
                              BBox: [{detection.bbox.join(', ')}]
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
