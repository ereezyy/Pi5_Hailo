import { useState } from 'react';
import { Upload, Layers, Play, Trash2, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface BatchInferenceProps {
  models: AIModel[];
  selectedModel: string;
}

interface BatchImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
}

export function BatchInference({ models, selectedModel }: BatchInferenceProps) {
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const newImages: BatchImage[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setProgress(0);
  };

  const processBatch = async () => {
    if (images.length === 0 || !selectedModel) return;

    setIsProcessing(true);
    setProgress(0);

    const model = models.find(m => m.id === selectedModel);
    if (!model) return;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      setImages(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, status: 'processing' } : img
        )
      );

      try {
        const { data: task, error: taskError } = await supabase
          .from('inference_tasks')
          .insert({
            model_id: selectedModel,
            task_name: `Batch: ${image.file.name}`,
            status: 'pending',
            input_source: 'file',
            input_path: image.file.name,
          })
          .select()
          .single();

        if (taskError) throw taskError;

        await supabase
          .from('inference_tasks')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', task.id);

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
            inputPath: image.file.name,
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

          setImages(prev =>
            prev.map(img =>
              img.id === image.id ? { ...img, status: 'completed', result } : img
            )
          );
        } else {
          throw new Error('Inference failed');
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setImages(prev =>
          prev.map(img =>
            img.id === image.id ? { ...img, status: 'failed' } : img
          )
        );
      }

      setProgress(((i + 1) / images.length) * 100);
    }

    setIsProcessing(false);
  };

  const getStatusIcon = (status: BatchImage['status']) => {
    switch (status) {
      case 'pending':
        return <Layers className="w-4 h-4 text-slate-400" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Batch Inference</h2>
        </div>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Add Images
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
          </label>

          {images.length > 0 && (
            <>
              <button
                onClick={processBatch}
                disabled={isProcessing || !selectedModel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Process Batch'}
              </button>

              <button
                onClick={clearAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {isProcessing && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">Processing batch...</span>
            <span className="text-sm text-emerald-400 font-medium">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No images selected</p>
          <p className="text-sm text-slate-500">
            Upload multiple images to process them in batch
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(image => (
            <div
              key={image.id}
              className="relative group bg-slate-700/50 rounded-lg overflow-hidden border border-slate-600"
            >
              <img
                src={image.preview}
                alt={image.file.name}
                className="w-full aspect-square object-cover"
              />

              <div className="absolute top-2 right-2">
                <button
                  onClick={() => removeImage(image.id)}
                  disabled={isProcessing}
                  className="p-1.5 bg-slate-900/80 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white truncate flex-1">
                    {image.file.name}
                  </span>
                  {getStatusIcon(image.status)}
                </div>

                {image.result && image.status === 'completed' && (
                  <div className="mt-2 text-xs">
                    <div className="text-emerald-400">
                      {image.result.detections?.length || 0} detections
                    </div>
                    <div className="text-slate-400">
                      {image.result.processingTimeMs}ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && !isProcessing && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">
              {images.length} images • {images.filter(i => i.status === 'completed').length} completed
            </span>
            <span className="text-slate-400">
              {images.filter(i => i.status === 'failed').length > 0 &&
                `${images.filter(i => i.status === 'failed').length} failed`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
