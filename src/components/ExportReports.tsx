import { useState } from 'react';
import { Download, FileText, Table, BarChart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface ExportReportsProps {
  models: AIModel[];
}

export function ExportReports({ models }: ExportReportsProps) {
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState<'tasks' | 'results' | 'analytics' | 'full'>('analytics');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const getDateFilter = () => {
    if (dateRange === 'all') return null;

    const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : 720;
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  };

  const exportTasks = async () => {
    let query = supabase
      .from('inference_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    const cutoff = getDateFilter();
    if (cutoff) {
      query = query.gte('created_at', cutoff);
    }

    const { data } = await query;
    return data || [];
  };

  const exportResults = async () => {
    let query = supabase
      .from('inference_results')
      .select(`
        *,
        inference_tasks (
          task_name,
          model_id,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    const cutoff = getDateFilter();
    if (cutoff) {
      query = query.gte('created_at', cutoff);
    }

    const { data } = await query;
    return data || [];
  };

  const exportAnalytics = async () => {
    const analytics: any = {
      generated_at: new Date().toISOString(),
      date_range: dateRange,
      models: [],
      summary: {
        total_tasks: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        total_detections: 0,
        avg_processing_time: 0,
      },
    };

    if (models.length === 0) return analytics;

    const modelIds = models.map(m => m.id);

    // ⚡ Bolt: Fixed N+1 query bottleneck by fetching all tasks for all models in a single batched query
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

    const cutoff = getDateFilter();
    if (cutoff) {
      query = query.gte('created_at', cutoff);
    }

    const { data: allTasks, error } = await query;

    if (error) {
      console.error('Error fetching analytics data:', error);
      return analytics;
    }

    // Group tasks by model ID in memory
    const tasksByModel = (allTasks || []).reduce((acc, task) => {
      if (!acc[task.model_id]) acc[task.model_id] = [];
      acc[task.model_id].push(task);
      return acc;
    }, {} as Record<string, typeof allTasks>);

    const allProcessingTimes: number[] = [];

    for (const model of models) {
      const tasks = tasksByModel[model.id] || [];

      if (tasks.length === 0) continue;

      const completed = tasks.filter(t => t.status === 'completed');
      const failed = tasks.filter(t => t.status === 'failed');

      const processingTimes = completed
        .map(t => t.inference_results?.[0]?.processing_time_ms)
        .filter((t): t is number => typeof t === 'number');

      const avgTime =
        processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0;

      let totalDetections = 0;
      completed.forEach(task => {
        const result = task.inference_results?.[0];
        if (result && Array.isArray(result.result_data)) {
          totalDetections += result.result_data.length;
        }

        // Also collect processing times for overall summary
        const time = result?.processing_time_ms;
        if (typeof time === 'number') {
          allProcessingTimes.push(time);
        }
      });

      analytics.models.push({
        model_name: model.name,
        model_type: model.model_type,
        total_tasks: tasks.length,
        completed_tasks: completed.length,
        failed_tasks: failed.length,
        success_rate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
        avg_processing_time_ms: avgTime,
        total_detections: totalDetections,
      });

      analytics.summary.total_tasks += tasks.length;
      analytics.summary.completed_tasks += completed.length;
      analytics.summary.failed_tasks += failed.length;
      analytics.summary.total_detections += totalDetections;
    }

    if (analytics.summary.completed_tasks > 0) {
      analytics.summary.avg_processing_time =
        allProcessingTimes.length > 0
          ? allProcessingTimes.reduce((a, b) => a + b, 0) / allProcessingTimes.length
          : 0;
    }

    return analytics;
  };

  const exportFullReport = async () => {
    return {
      metadata: {
        generated_at: new Date().toISOString(),
        date_range: dateRange,
        report_type: 'full',
      },
      tasks: await exportTasks(),
      results: await exportResults(),
      analytics: await exportAnalytics(),
    };
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);

    try {
      let data: any;

      switch (reportType) {
        case 'tasks':
          data = await exportTasks();
          break;
        case 'results':
          data = await exportResults();
          break;
        case 'analytics':
          data = await exportAnalytics();
          break;
        case 'full':
          data = await exportFullReport();
          break;
      }

      if (format === 'json') {
        downloadJSON(data, `hailo_${reportType}_${dateRange}_${Date.now()}.json`);
      } else {
        downloadCSV(data, `hailo_${reportType}_${dateRange}_${Date.now()}.csv`);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any, filename: string) => {
    let csv = '';

    if (reportType === 'analytics') {
      csv = 'Model Name,Model Type,Total Tasks,Completed,Failed,Success Rate %,Avg Processing Time (ms),Total Detections\n';

      data.models.forEach((model: any) => {
        csv += `${model.model_name},${model.model_type},${model.total_tasks},${model.completed_tasks},${model.failed_tasks},${model.success_rate.toFixed(2)},${model.avg_processing_time_ms.toFixed(2)},${model.total_detections}\n`;
      });
    } else if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      csv = headers.join(',') + '\n';

      data.forEach((row: any) => {
        csv += headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        }).join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-500/10 rounded-lg">
          <FileText className="w-5 h-5 text-teal-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Export Reports</h2>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none"
            >
              <option value="analytics">Analytics Summary</option>
              <option value="tasks">Inference Tasks</option>
              <option value="results">Inference Results</option>
              <option value="full">Full Report (All Data)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export as JSON'}
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Table className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
        </div>

        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Report Contents
          </h3>

          <div className="text-sm text-slate-300 space-y-2">
            {reportType === 'analytics' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Per-model performance statistics</li>
                <li>Success rates and failure counts</li>
                <li>Average processing times</li>
                <li>Total detection counts</li>
                <li>Overall summary metrics</li>
              </ul>
            )}

            {reportType === 'tasks' && (
              <ul className="list-disc list-inside space-y-1">
                <li>All inference tasks with timestamps</li>
                <li>Task status and completion times</li>
                <li>Input sources and model references</li>
                <li>Priority and configuration details</li>
              </ul>
            )}

            {reportType === 'results' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Complete inference results data</li>
                <li>Detection objects and bounding boxes</li>
                <li>Confidence scores per detection</li>
                <li>Processing time metrics</li>
              </ul>
            )}

            {reportType === 'full' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Comprehensive data export</li>
                <li>All tasks, results, and analytics</li>
                <li>Complete system snapshot</li>
                <li>Suitable for backup and auditing</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
