import { Cpu } from 'lucide-react';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ models, selectedModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Cpu className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">AI Models</h2>
      </div>

      <div className="space-y-3">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              selectedModel === model.id
                ? 'bg-emerald-500/10 border-emerald-500 shadow-md'
                : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="font-semibold text-white mb-1">{model.name}</div>
            <div className="text-sm text-slate-400 mb-2">{model.description}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300">
                {model.model_type}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-600 text-slate-300">
                {model.input_resolution}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
