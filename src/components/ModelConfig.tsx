import { useState } from 'react';
import { Settings, Save, RefreshCw, Upload, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface ModelConfigProps {
  models: AIModel[];
  onUpdate: () => void;
}

export function ModelConfig({ models, onUpdate }: ModelConfigProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [config, setConfig] = useState({
    confidenceThreshold: 0.5,
    nmsThreshold: 0.45,
    maxDetections: 100,
    inputSize: '640x640',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingHef, setUploadingHef] = useState(false);

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);

    const modelConfig = model.config as any || {};
    setConfig({
      confidenceThreshold: modelConfig.confidence_threshold || 0.5,
      nmsThreshold: modelConfig.nms_threshold || 0.45,
      maxDetections: modelConfig.max_detections || 100,
      inputSize: model.input_resolution || '640x640',
      isActive: model.is_active,
    });
  };

  const handleSave = async () => {
    if (!selectedModel) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('ai_models')
        .update({
          input_resolution: config.inputSize,
          is_active: config.isActive,
          config: {
            confidence_threshold: config.confidenceThreshold,
            nms_threshold: config.nmsThreshold,
            max_detections: config.maxDetections,
          },
        })
        .eq('id', selectedModel.id);

      if (error) throw error;

      onUpdate();
      setSelectedModel(null);
    } catch (error) {
      console.error('Error saving model config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleHefUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.hef')) return;

    setUploadingHef(true);

    try {
      const modelName = file.name.replace('.hef', '');

      const { data: existing } = await supabase
        .from('ai_models')
        .select('id')
        .eq('name', modelName)
        .maybeSingle();

      if (existing) {
        alert('Model with this name already exists');
        return;
      }

      const { error } = await supabase.from('ai_models').insert({
        name: modelName,
        description: `Uploaded HEF model: ${modelName}`,
        model_type: 'object_detection',
        hef_file_path: `/uploaded/models/${file.name}`,
        input_resolution: '640x640',
        is_active: true,
      });

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error('Error uploading model:', error);
    } finally {
      setUploadingHef(false);
    }
  };

  const toggleModelStatus = async (model: AIModel) => {
    await supabase
      .from('ai_models')
      .update({ is_active: !model.is_active })
      .eq('id', model.id);

    onUpdate();
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Model Configuration</h2>
        </div>

        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploadingHef ? 'Uploading...' : 'Upload HEF'}
          <input
            type="file"
            accept=".hef"
            onChange={handleHefUpload}
            className="hidden"
            disabled={uploadingHef}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h3 className="text-white font-medium mb-3">Available Models</h3>

          {models.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No models available
            </div>
          ) : (
            <div className="space-y-2">
              {models.map(model => (
                <div
                  key={model.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModel?.id === model.id
                      ? 'bg-indigo-500/20 border-indigo-500'
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => handleModelSelect(model)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-white font-medium">{model.name}</div>
                      <div className="text-xs text-slate-400 capitalize">
                        {model.model_type}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModelStatus(model);
                      }}
                      className={`p-1 rounded transition-colors ${
                        model.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-600 text-slate-400'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-500">{model.input_resolution}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedModel ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-medium mb-4">
                  Configure {selectedModel.name}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Confidence Threshold
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.confidenceThreshold}
                        onChange={(e) =>
                          setConfig({ ...config, confidenceThreshold: parseFloat(e.target.value) })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-medium w-16 text-right">
                        {(config.confidenceThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Minimum confidence score for detections
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      NMS Threshold
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.nmsThreshold}
                        onChange={(e) =>
                          setConfig({ ...config, nmsThreshold: parseFloat(e.target.value) })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-medium w-16 text-right">
                        {(config.nmsThreshold * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Non-maximum suppression threshold for overlapping detections
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Max Detections
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={config.maxDetections}
                      onChange={(e) =>
                        setConfig({ ...config, maxDetections: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Maximum number of detections per inference
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Input Resolution
                    </label>
                    <select
                      value={config.inputSize}
                      onChange={(e) => setConfig({ ...config, inputSize: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="416x416">416x416</option>
                      <option value="512x512">512x512</option>
                      <option value="640x640">640x640</option>
                      <option value="1280x1280">1280x1280</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Input image resolution for inference
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.isActive}
                        onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                        className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500"
                      />
                      <span className="text-slate-300">Model Active</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      Enable or disable this model for inference
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>

                <button
                  onClick={() => handleModelSelect(selectedModel)}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-sm text-blue-300">
                  <div className="font-medium mb-2">Configuration Tips</div>
                  <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                    <li>Higher confidence threshold reduces false positives</li>
                    <li>Lower NMS threshold removes more overlapping detections</li>
                    <li>Larger input resolution improves accuracy but reduces speed</li>
                    <li>Adjust max detections based on expected object count</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Settings className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p>Select a model to configure</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
