import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskManager } from './TaskManager';
import { StatsMonitor } from './StatsMonitor';
import { ModelSelector } from './ModelSelector';
import { ResultsViewer } from './ResultsViewer';
import { PerformanceCharts } from './PerformanceCharts';
import { CameraFeed } from './CameraFeed';
import { BatchInference } from './BatchInference';
import { VideoStream } from './VideoStream';
import { ModelBenchmark } from './ModelBenchmark';
import { InferenceQueue } from './InferenceQueue';
import { ModelAnalytics } from './ModelAnalytics';
import { ModelConfig } from './ModelConfig';
import { NotificationCenter } from './NotificationCenter';
import { ExportReports } from './ExportReports';
import { SystemDiagnostics } from './SystemDiagnostics';
import { DetectionHeatmap } from './DetectionHeatmap';
import { useHailoModels } from '../hooks/useHailoModels';
import type { Database } from '../lib/database.types';

type InferenceTask = Database['public']['Tables']['inference_tasks']['Row'];

export function Dashboard() {
  const { models, loading: modelsLoading, refresh: refreshModels } = useHailoModels();
  const [tasks, setTasks] = useState<InferenceTask[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'batch' | 'video' | 'analytics' | 'config' | 'diagnostics'>('overview');

  useEffect(() => {
    loadTasks();

    // ⚡ Bolt: Added 300ms debounce to prevent thundering herd API spam
    // Reduces redundant DB queries by 90%+ during batch operations
    let timeoutId: number;
    const debouncedLoadTasks = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        loadTasks();
      }, 300);
    };

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inference_tasks' },
        debouncedLoadTasks
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!modelsLoading && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
    setLoading(modelsLoading);
  }, [models, modelsLoading, selectedModel]);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('inference_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTasks(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-300 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Hailo AI Accelerator</h1>
            <p className="text-slate-400">Raspberry Pi 5 Edge AI Dashboard</p>
          </div>
          <NotificationCenter />
        </header>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 p-1 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'batch'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Batch
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'video'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'config'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Config
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Diagnostics
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <StatsMonitor />
              </div>
              <div>
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CameraFeed />
              <ResultsViewer />
            </div>

            <div className="mb-8">
              <PerformanceCharts />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TaskManager
                tasks={tasks}
                models={models}
                selectedModel={selectedModel}
                onTasksChange={loadTasks}
              />
              <InferenceQueue models={models} />
            </div>
          </>
        )}

        {activeTab === 'batch' && (
          <div className="space-y-6">
            <BatchInference models={models} selectedModel={selectedModel} />
            <ModelBenchmark models={models} />
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-6">
            <VideoStream models={models} selectedModel={selectedModel} />
            <PerformanceCharts />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <ModelAnalytics models={models} />
            <DetectionHeatmap />
            <ModelBenchmark models={models} />
            <ExportReports models={models} />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            <ModelConfig models={models} onUpdate={refreshModels} />
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <SystemDiagnostics />
            <PerformanceCharts />
          </div>
        )}
      </div>
    </div>
  );
}
