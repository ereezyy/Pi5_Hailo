import { useState, useRef, useEffect } from 'react';
import { Video, Play, Square, Camera, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface VideoStreamProps {
  models: AIModel[];
  selectedModel: string;
}

interface Detection {
  class: string;
  confidence: number;
  bbox: number[];
}

export function VideoStream({ models, selectedModel }: VideoStreamProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);
  const [fps, setFps] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferenceInterval, setInferenceInterval] = useState(500);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferenceTimerRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopStreaming = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (inferenceTimerRef.current) {
      clearInterval(inferenceTimerRef.current);
      inferenceTimerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsInferencing(false);
    setDetections([]);
    setFps(0);
  };

  const startInference = () => {
    if (!selectedModel || !isStreaming) return;

    setIsInferencing(true);

    inferenceTimerRef.current = window.setInterval(async () => {
      await runInference();
    }, inferenceInterval);
  };

  const stopInference = () => {
    if (inferenceTimerRef.current) {
      clearInterval(inferenceTimerRef.current);
      inferenceTimerRef.current = null;
    }
    setIsInferencing(false);
    setDetections([]);
  };

  const runInference = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const model = models.find(m => m.id === selectedModel);
    if (!model) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      const { data: task } = await supabase
        .from('inference_tasks')
        .insert({
          model_id: selectedModel,
          task_name: 'Video Stream Frame',
          status: 'processing',
          input_source: 'camera',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!task) return;

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
          inputPath: 'video_frame',
          inputResolution: model.input_resolution,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        setDetections(result.detections || []);

        fpsCounterRef.current.frames++;
        const now = Date.now();
        const elapsed = now - fpsCounterRef.current.lastTime;

        if (elapsed >= 1000) {
          setFps(Math.round((fpsCounterRef.current.frames * 1000) / elapsed));
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = now;
        }

        // ⚡ Bolt: Parallelized independent DB writes to halve network wait time
        await Promise.all([
          supabase.from('inference_results').insert({
            task_id: task.id,
            result_data: result.detections,
            confidence_scores: result.detections.map((d: Detection) => d.confidence),
            processing_time_ms: result.processingTimeMs,
          }),
          supabase
            .from('inference_tasks')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', task.id)
        ]);
      }
    } catch (error) {
      console.error('Inference error:', error);
    }
  };

  const drawDetections = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    detections.forEach(detection => {
      const [x, y, w, h] = detection.bbox;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w - x, h - y);

      ctx.fillStyle = '#10b981';
      ctx.fillRect(x, y - 25, 150, 25);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        `${detection.class} ${(detection.confidence * 100).toFixed(0)}%`,
        x + 5,
        y - 7
      );
    });
  };

  useEffect(() => {
    if (isInferencing) {
      const animationId = requestAnimationFrame(function animate() {
        drawDetections();
        requestAnimationFrame(animate);
      });

      return () => cancelAnimationFrame(animationId);
    }
  }, [isInferencing, detections]);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <Video className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Live Video Stream</h2>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300">Live</span>
            </div>

            {isInferencing && (
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
                {fps} FPS
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isInferencing ? 'hidden' : 'block'}`}
          />

          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover ${isInferencing ? 'block' : 'hidden'}`}
          />

          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Video className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Camera off</p>
              </div>
            </div>
          )}

          {isInferencing && detections.length > 0 && (
            <div className="absolute top-4 right-4 space-y-2">
              {detections.map((detection, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-emerald-500/50"
                >
                  <div className="text-white font-medium capitalize">
                    {detection.class}
                  </div>
                  <div className="text-emerald-400 text-sm">
                    {(detection.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!isStreaming ? (
            <button
              onClick={startStreaming}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={stopStreaming}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Camera
              </button>

              {!isInferencing ? (
                <button
                  onClick={startInference}
                  disabled={!selectedModel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Start Inference
                </button>
              ) : (
                <button
                  onClick={stopInference}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop Inference
                </button>
              )}
            </>
          )}

          {isStreaming && !isInferencing && (
            <div className="flex items-center gap-2 ml-auto">
              <Settings className="w-4 h-4 text-slate-400" />
              <select
                value={inferenceInterval}
                onChange={(e) => setInferenceInterval(Number(e.target.value))}
                className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value={100}>10 FPS</option>
                <option value={200}>5 FPS</option>
                <option value={500}>2 FPS</option>
                <option value={1000}>1 FPS</option>
              </select>
            </div>
          )}
        </div>

        {isInferencing && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300">
              Running inference at {(1000 / inferenceInterval).toFixed(1)} FPS target rate.
              Detections are drawn in real-time with bounding boxes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
