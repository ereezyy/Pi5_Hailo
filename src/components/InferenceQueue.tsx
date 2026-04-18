import { useState, useEffect, useMemo } from 'react';
import { ListOrdered, Play, Pause, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type InferenceTask = Database['public']['Tables']['inference_tasks']['Row'];
type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface InferenceQueueProps {
  models: AIModel[];
}

interface QueueTask extends InferenceTask {
  model?: AIModel;
}

export function InferenceQueue({ models }: InferenceQueueProps) {
  const modelsMap = useMemo(() => new Map(models.map(m => [m.id, m])), [models]);
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<QueueTask | null>(null);

  useEffect(() => {
    loadQueue();

    const subscription = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inference_tasks' },
        () => {
          loadQueue();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadQueue = async () => {
    const { data, error } = await supabase
      .from('inference_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      const tasksWithModels = data.map(task => ({
        ...task,
        model: modelsMap.get(task.model_id),
      }));
      setQueue(tasksWithModels);
    }
  };

  const updatePriority = async (taskId: string, newPriority: number) => {
    const clampedPriority = Math.max(1, Math.min(10, newPriority));

    await supabase
      .from('inference_tasks')
      .update({ priority: clampedPriority })
      .eq('id', taskId);

    loadQueue();
  };

  const removeFromQueue = async (taskId: string) => {
    await supabase
      .from('inference_tasks')
      .delete()
      .eq('id', taskId);

    loadQueue();
  };

  const startQueue = async () => {
    setIsProcessing(true);
    await processQueue();
  };

  const stopQueue = () => {
    setIsProcessing(false);
    setCurrentTask(null);
  };

  const processQueue = async () => {
    while (isProcessing) {
      const { data: tasks } = await supabase
        .from('inference_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (!tasks || tasks.length === 0) {
        setIsProcessing(false);
        setCurrentTask(null);
        break;
      }

      const task = tasks[0];
      const model = modelsMap.get(task.model_id);

      setCurrentTask({ ...task, model });

      await supabase
        .from('inference_tasks')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', task.id);

      try {
        if (!model) throw new Error('Model not found');

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hailo-inference/run-inference`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.id,
            modelPath: model.hef_file_path,
            inputPath: task.input_path || '/default/image.jpg',
            inputResolution: model.input_resolution,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          await supabase.from('inference_results').insert({
            task_id: task.id,
            result_data: result.detections,
            confidence_scores: result.detections.map((d: any) => d.confidence),
            processing_time_ms: result.processingTimeMs,
          });

          await supabase
            .from('inference_tasks')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', task.id);
        } else {
          throw new Error('Inference failed');
        }
      } catch (error) {
        console.error('Queue processing error:', error);
        await supabase
          .from('inference_tasks')
          .update({ status: 'failed' })
          .eq('id', task.id);
      }

      await loadQueue();

      if (!isProcessing) break;
    }

    setCurrentTask(null);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-400 bg-red-500/20';
    if (priority >= 5) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-600/50';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <ListOrdered className="w-5 h-5 text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Inference Queue</h2>
          <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm font-medium">
            {queue.length} pending
          </span>
        </div>

        <div className="flex gap-2">
          {!isProcessing ? (
            <button
              onClick={startQueue}
              disabled={queue.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Queue
            </button>
          ) : (
            <button
              onClick={stopQueue}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4" />
              Stop Queue
            </button>
          )}
        </div>
      </div>

      {currentTask && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-400 font-medium">Processing Current Task</span>
          </div>
          <div className="text-white">{currentTask.task_name}</div>
          <div className="text-sm text-slate-400">Model: {currentTask.model?.name}</div>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="text-center py-12">
          <ListOrdered className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Queue is empty</p>
          <p className="text-sm text-slate-500">
            Pending tasks will appear here for scheduled processing
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((task, index) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="text-slate-500 font-mono text-sm w-6">
                  #{index + 1}
                </div>

                <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  P{task.priority}
                </div>
              </div>

              <div className="flex-1">
                <div className="text-white font-medium">{task.task_name}</div>
                <div className="text-sm text-slate-400">
                  Model: {task.model?.name || 'Unknown'} • {task.input_source}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updatePriority(task.id, task.priority + 1)}
                  disabled={isProcessing || task.priority >= 10}
                  className="p-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                  title="Increase priority"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <button
                  onClick={() => updatePriority(task.id, task.priority - 1)}
                  disabled={isProcessing || task.priority <= 1}
                  className="p-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
                  title="Decrease priority"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => removeFromQueue(task.id)}
                  disabled={isProcessing}
                  className="p-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors ml-1"
                  title="Remove from queue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="text-xs text-slate-400">
            Tasks are processed in priority order (10 = highest, 1 = lowest).
            Equal priority tasks are processed in FIFO order.
          </div>
        </div>
      )}
    </div>
  );
}
