import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIModel = Database['public']['Tables']['ai_models']['Row'];

export function useHailoModels() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    setError(null);

    try {
      await scanAndSyncModels();

      const { data, error: dbError } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setModels(data || []);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const scanAndSyncModels = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hailo-inference/models`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch models from Hailo service');
        return;
      }

      const { models: discoveredModels } = await response.json();

      if (!discoveredModels || discoveredModels.length === 0) {
        return;
      }

      for (const model of discoveredModels) {
        const { data: existing } = await supabase
          .from('ai_models')
          .select('id')
          .eq('hef_file_path', model.hef_file_path)
          .maybeSingle();

        if (!existing) {
          await supabase.from('ai_models').insert({
            name: model.name,
            description: model.description,
            model_type: model.model_type,
            hef_file_path: model.hef_file_path,
            input_resolution: model.input_resolution,
            is_active: model.is_active,
          });
        }
      }
    } catch (err) {
      console.error('Error syncing models:', err);
    }
  };

  return { models, loading, error, refresh: loadModels };
}
