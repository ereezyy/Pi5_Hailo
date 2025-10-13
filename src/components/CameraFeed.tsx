import { useState, useRef } from 'react';
import { Camera, Video, Image, Upload, Play, Square } from 'lucide-react';

interface CameraFeedProps {
  onCapture?: (imageData: string) => void;
}

export function CameraFeed({ onCapture }: CameraFeedProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        onCapture?.(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        onCapture?.(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Camera className="w-5 h-5 text-purple-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Input Source</h2>
      </div>

      <div className="space-y-4">
        <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No video source</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-wrap gap-2">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Camera
              </button>
              <button
                onClick={captureImage}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Camera className="w-4 h-4" />
                Capture
              </button>
            </>
          )}

          <label className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {capturedImage && (
            <button
              onClick={() => setCapturedImage(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              <Image className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {capturedImage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-400">
              Image ready for inference. Create a task to process it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
