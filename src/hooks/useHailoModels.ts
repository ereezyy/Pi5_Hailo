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
      const { data, error: dbError } = await supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setModels(data || []);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load models. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return { models, loading, error, refresh: loadModels };
}
