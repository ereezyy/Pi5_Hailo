import { useState } from 'react';
import { Timer, Zap, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface BenchmarkResult {
  modelId: string;
  modelName: string;
  avgProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  avgFps: number;
  totalInferences: number;
  successRate: number;
}

interface ModelBenchmarkProps {
  models: AIModel[];
}

export function ModelBenchmark({ models }: ModelBenchmarkProps) {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const runBenchmark = async () => {
    setLoading(true);

    try {
      const modelsToTest = selectedModel === 'all' ? models : models.filter(m => m.id === selectedModel);
      const modelIds = modelsToTest.map(m => m.id);
      const benchmarkResults: BenchmarkResult[] = [];

      const { data: allTasks } = await supabase
        .from('inference_tasks')
        .select(`
          id,
          model_id,
          status,
          inference_results (
            processing_time_ms
          )
        `)
        .in('model_id', modelIds);

      const tasksByModel = (allTasks || []).reduce((acc, task) => {
        if (!acc[task.model_id]) acc[task.model_id] = [];
        acc[task.model_id].push(task);
        return acc;
      }, {} as Record<string, any[]>);

      for (const model of modelsToTest) {
        const tasks = tasksByModel[model.id] || [];

        if (tasks.length === 0) continue;

        const completedTasks = tasks.filter(t => t.status === 'completed');
        const processingTimes = completedTasks
          .map(t => t.inference_results?.[0]?.processing_time_ms)
          .filter((t): t is number => typeof t === 'number');

        if (processingTimes.length === 0) continue;

        const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
        const minTime = Math.min(...processingTimes);
        const maxTime = Math.max(...processingTimes);
        const avgFps = 1000 / avgTime;
        const successRate = (completedTasks.length / tasks.length) * 100;

        benchmarkResults.push({
          modelId: model.id,
          modelName: model.name,
          avgProcessingTime: avgTime,
          minProcessingTime: minTime,
          maxProcessingTime: maxTime,
          avgFps,
          totalInferences: tasks.length,
          successRate,
        });
      }

      benchmarkResults.sort((a, b) => a.avgProcessingTime - b.avgProcessingTime);
      setResults(benchmarkResults);
    } catch (error) {
      console.error('Benchmark error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 30) return 'text-emerald-400';
    if (fps >= 15) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Timer className="w-5 h-5 text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Model Benchmark</h2>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Models</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>

          <button
            onClick={runBenchmark}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Activity className="w-4 h-4" />
            {loading ? 'Running...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <Timer className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No benchmark data available</p>
          <p className="text-sm text-slate-500">
            Run benchmark to analyze model performance
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={result.modelId}
              className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {index === 0 && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
                        Fastest
                      </span>
                    )}
                    <h3 className="text-white font-semibold">{result.modelName}</h3>
                  </div>
                  <div className="text-sm text-slate-400">
                    {result.totalInferences} total inferences
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-bold ${getFpsColor(result.avgFps)}`}>
                    {result.avgFps.toFixed(1)} FPS
                  </div>
                  <div className="text-xs text-slate-400">average</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-600/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-slate-400">Avg Time</span>
                  </div>
                  <div className="text-white font-semibold">
                    {result.avgProcessingTime.toFixed(1)}ms
                  </div>
                </div>

                <div className="bg-slate-600/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-400">Best Time</span>
                  </div>
                  <div className="text-white font-semibold">
                    {result.minProcessingTime.toFixed(1)}ms
                  </div>
                </div>

                <div className="bg-slate-600/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-orange-400" />
                    <span className="text-xs text-slate-400">Worst Time</span>
                  </div>
                  <div className="text-white font-semibold">
                    {result.maxProcessingTime.toFixed(1)}ms
                  </div>
                </div>

                <div className="bg-slate-600/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-slate-400">Success Rate</span>
                  </div>
                  <div className="text-white font-semibold">
                    {result.successRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-600">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Performance Range</span>
                  <span>{result.minProcessingTime.toFixed(1)}ms - {result.maxProcessingTime.toFixed(1)}ms</span>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <div className="font-medium mb-1">Benchmark Notes</div>
                <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                  <li>Results based on historical inference data</li>
                  <li>Lower processing time indicates better performance</li>
                  <li>FPS calculated as 1000ms / avg processing time</li>
                  <li>Run more inferences for more accurate benchmarks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
