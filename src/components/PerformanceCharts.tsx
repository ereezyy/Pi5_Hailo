import { useState, useEffect } from 'react';
import { TrendingUp, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AcceleratorStats = Database['public']['Tables']['accelerator_stats']['Row'];

export function PerformanceCharts() {
  const [stats, setStats] = useState<AcceleratorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('accelerator_stats')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setStats(data.reverse());
    }
    setLoading(false);
  };

  const getMaxValue = (field: keyof AcceleratorStats) => {
    if (stats.length === 0) return 100;
    return Math.max(...stats.map(s => Number(s[field]) || 0)) * 1.2;
  };

  const renderMiniChart = (
    data: number[],
    color: string,
    label: string,
    unit: string,
    icon: React.ReactNode
  ) => {
    if (data.length === 0) return null;

    const max = Math.max(...data) * 1.2;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    }).join(' ');

    const currentValue = data[data.length - 1];
    const previousValue = data[data.length - 2] || currentValue;
    const change = currentValue - previousValue;
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

    return (
      <div className="bg-slate-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${color.replace('text-', 'bg-')}/10`}>
              {icon}
            </div>
            <span className="text-sm text-slate-300">{label}</span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-semibold ${color}`}>
              {currentValue.toFixed(1)}{unit}
            </div>
            {changePercent !== 0 && (
              <div className={`text-xs ${changePercent > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <svg
          viewBox="0 0 100 30"
          className="w-full h-12"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className={color} />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={color} />
            </linearGradient>
          </defs>

          <polygon
            points={`0,30 ${points} 100,30`}
            fill={`url(#gradient-${label})`}
          />

          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={color}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
        <div className="text-slate-400">Loading performance data...</div>
      </div>
    );
  }

  const temperatureData = stats.map(s => Number(s.temperature));
  const powerData = stats.map(s => Number(s.power_consumption));
  const utilizationData = stats.map(s => Number(s.utilization_percent));
  const fpsData = stats.map(s => Number(s.average_fps));

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <TrendingUp className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Performance Trends</h2>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          Collecting performance data...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderMiniChart(
            temperatureData,
            'text-orange-400',
            'Temperature',
            '°C',
            <Activity className="w-4 h-4 text-orange-400" />
          )}
          {renderMiniChart(
            powerData,
            'text-yellow-400',
            'Power',
            'W',
            <Activity className="w-4 h-4 text-yellow-400" />
          )}
          {renderMiniChart(
            utilizationData,
            'text-blue-400',
            'Utilization',
            '%',
            <Activity className="w-4 h-4 text-blue-400" />
          )}
          {renderMiniChart(
            fpsData,
            'text-emerald-400',
            'FPS',
            '',
            <Activity className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 text-center">
          Showing last 20 data points • Updates every 5 seconds
        </div>
      </div>
    </div>
  );
}
