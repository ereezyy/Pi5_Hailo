import { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface ModelStats {
  modelId: string;
  modelName: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgProcessingTime: number;
  totalDetections: number;
  avgConfidence: number;
}

interface ModelAnalyticsProps {
  models: AIModel[];
}

export function ModelAnalytics({ models }: ModelAnalyticsProps) {
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, models]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const modelStats: ModelStats[] = [];

      // ⚡ Bolt: Fixed N+1 query problem by batching task fetching for all models into a single query.
      // Instead of querying `inference_tasks` sequentially for each model in a loop,
      // we now fetch all relevant tasks once and group them by model_id in memory.
      // This reduces network requests from O(N) to O(1) and significantly improves load time.
      if (models.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const modelIds = models.map(m => m.id);

      let query = supabase
        .from('inference_tasks')
        .select(`
          id,
          model_id,
          status,
          created_at,
          inference_results (
            processing_time_ms,
            result_data,
            confidence_scores
          )
        `)
        .in('model_id', modelIds);

      if (timeRange !== 'all') {
        const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', cutoff);
      }

      const { data: allTasks, error } = await query;

      if (error) {
        console.error('Error fetching analytics data:', error);
        throw error;
      }

      const tasksByModel = (allTasks || []).reduce((acc, task) => {
        if (!acc[task.model_id]) acc[task.model_id] = [];
        acc[task.model_id].push(task);
        return acc;
      }, {} as Record<string, typeof allTasks>);

      for (const model of models) {
        const tasks = tasksByModel[model.id] || [];

        if (tasks.length === 0) continue;

        // @ts-expect-error - Supabase type generation doesn't perfectly handle joins yet
        const typedTasks = tasks as unknown as any[];

        const completed = typedTasks.filter(t => t.status === 'completed');
        const failed = typedTasks.filter(t => t.status === 'failed');

        const processingTimes = completed
          .map(t => t.inference_results?.[0]?.processing_time_ms)
          .filter((t): t is number => typeof t === 'number');

        const avgProcessingTime =
          processingTimes.length > 0
            ? processingTimes.reduce((a: number, b: number) => a + b, 0) / processingTimes.length
            : 0;

        let totalDetections = 0;
        let confidenceSum = 0;
        let confidenceCount = 0;

        completed.forEach(task => {
          const result = task.inference_results?.[0];
          if (result) {
            const detections = Array.isArray(result.result_data) ? result.result_data : [];
            totalDetections += detections.length;

            const scores = Array.isArray(result.confidence_scores) ? result.confidence_scores : [];
            scores.forEach(score => {
              if (typeof score === 'number') {
                confidenceSum += score;
                confidenceCount++;
              }
            });
          }
        });

        const avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

        modelStats.push({
          modelId: model.id,
          modelName: model.name,
          totalTasks: tasks.length,
          completedTasks: completed.length,
          failedTasks: failed.length,
          avgProcessingTime,
          totalDetections,
          avgConfidence,
        });
      }

      modelStats.sort((a, b) => b.totalTasks - a.totalTasks);
      setStats(modelStats);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalTasks = () => stats.reduce((sum, s) => sum + s.totalTasks, 0);
  const getSuccessRate = (stat: ModelStats) =>
    stat.totalTasks > 0 ? (stat.completedTasks / stat.totalTasks) * 100 : 0;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-lg">
            <BarChart3 className="w-5 h-5 text-pink-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Model Analytics</h2>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-pink-500 focus:outline-none"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading analytics...</div>
      ) : stats.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No analytics data available</p>
          <p className="text-sm text-slate-500">
            Run some inference tasks to see analytics
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-400">Total Inferences</span>
              </div>
              <div className="text-2xl font-bold text-white">{getTotalTasks()}</div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-400">Most Used Model</span>
              </div>
              <div className="text-lg font-bold text-white truncate">
                {stats[0]?.modelName || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-400">Avg Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(stats.reduce((sum, s) => sum + getSuccessRate(s), 0) / stats.length).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-semibold">Model Comparison</h3>

            {stats.map(stat => {
              const successRate = getSuccessRate(stat);
              const usagePercent = getTotalTasks() > 0 ? (stat.totalTasks / getTotalTasks()) * 100 : 0;

              return (
                <div
                  key={stat.modelId}
                  className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-medium">{stat.modelName}</div>
                      <div className="text-sm text-slate-400">
                        {stat.totalTasks} inferences ({usagePercent.toFixed(1)}% of total)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-semibold ${successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {successRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-400">success rate</div>
                    </div>
                  </div>

                  <div className="h-2 bg-slate-600 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-pink-500 transition-all duration-300"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-slate-400 text-xs mb-1">Avg Time</div>
                      <div className="text-white font-medium">
                        {stat.avgProcessingTime.toFixed(0)}ms
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-xs mb-1">Completed</div>
                      <div className="text-emerald-400 font-medium">
                        {stat.completedTasks}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-xs mb-1">Failed</div>
                      <div className="text-red-400 font-medium">
                        {stat.failedTasks}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-xs mb-1">Detections</div>
                      <div className="text-cyan-400 font-medium">
                        {stat.totalDetections}
                      </div>
                    </div>
                  </div>

                  {stat.avgConfidence > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Average Confidence</span>
                        <span className="text-emerald-400 font-medium">
                          {(stat.avgConfidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
