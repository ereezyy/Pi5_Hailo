import { useState, useMemo } from 'react';
import { Plus, Play, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];
type InferenceTask = Database['public']['Tables']['inference_tasks']['Row'];

interface TaskManagerProps {
  tasks: InferenceTask[];
  models: AIModel[];
  selectedModel: string;
  onTasksChange: () => void;
}

export function TaskManager({ tasks, models, selectedModel, onTasksChange }: TaskManagerProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [inputSource, setInputSource] = useState('camera');
  const [inputPath, setInputPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ⚡ Bolt Performance Optimization
  // Replaced O(N) Array.find() inside render loop with O(1) Map lookup
  // This prevents UI lag when rendering large lists of tasks
  const modelsMap = useMemo(() => {
    return new Map(models.map(m => [m.id, m]));
  }, [models]);

  const createTask = async () => {
    if (!taskName.trim() || !selectedModel) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('inference_tasks').insert({
        model_id: selectedModel,
        task_name: taskName.trim(),
        status: 'pending',
        input_source: inputSource,
        input_path: inputPath.trim() || null,
      });

      if (!error) {
        setTaskName('');
        setInputPath('');
        setShowNewTask(false);
        onTasksChange();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runTask = async (taskId: string) => {
    try {
      await supabase
        .from('inference_tasks')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', taskId);

      const task = tasks.find(t => t.id === taskId);
      const model = task ? modelsMap.get(task.model_id) : undefined;

      if (!task || !model) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hailo-inference/run-inference`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          modelPath: model.hef_file_path,
          inputPath: task.input_path || '/default/image.jpg',
          inputResolution: model.input_resolution,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        await supabase.from('inference_results').insert({
          task_id: taskId,
          result_data: result.detections,
          confidence_scores: result.detections.map((d: any) => d.confidence),
          processing_time_ms: result.processingTimeMs,
        });

        await supabase
          .from('inference_tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', taskId);

        onTasksChange();
      } else {
        await supabase
          .from('inference_tasks')
          .update({ status: 'failed' })
          .eq('id', taskId);
      }
    } catch (error) {
      console.error('Error running task:', error);
      await supabase
        .from('inference_tasks')
        .update({ status: 'failed' })
        .eq('id', taskId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-slate-400" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-slate-600 text-slate-300';
      case 'processing':
        return 'bg-blue-500 text-white';
      case 'completed':
        return 'bg-emerald-500 text-white';
      case 'failed':
        return 'bg-red-500 text-white';
      default:
        return 'bg-slate-600 text-slate-300';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Inference Tasks</h2>
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {showNewTask && (
        <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <input
            type="text"
            placeholder="Task name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg mb-3 border border-slate-500 focus:border-emerald-500 focus:outline-none"
          />

          <select
            value={inputSource}
            onChange={(e) => setInputSource(e.target.value)}
            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg mb-3 border border-slate-500 focus:border-emerald-500 focus:outline-none"
          >
            <option value="camera">Camera</option>
            <option value="file">File</option>
            <option value="url">URL</option>
          </select>

          {inputSource !== 'camera' && (
            <input
              type="text"
              placeholder={inputSource === 'file' ? 'File path' : 'URL'}
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg mb-3 border border-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={createTask}
              disabled={isSubmitting || !taskName.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
            <button
              onClick={() => setShowNewTask(false)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No tasks yet. Create your first inference task!
          </div>
        ) : (
          tasks.map((task) => {
            const model = modelsMap.get(task.model_id);
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {getStatusIcon(task.status)}
                  <div>
                    <div className="text-white font-medium">{task.task_name}</div>
                    <div className="text-sm text-slate-400">
                      Model: {model?.name || 'Unknown'} • {task.input_source}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>

                  {task.status === 'pending' && (
                    <button
                      onClick={() => runTask(task.id)}
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                      title="Run task"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
