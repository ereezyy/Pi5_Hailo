import { useState, useEffect } from 'react';
import { Activity, Zap, Thermometer, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AcceleratorStats {
  connected: boolean;
  temperature: number;
  powerConsumption: number;
  utilizationPercent: number;
  totalInferences: number;
  averageFps: number;
  timestamp: string;
}

export function StatsMonitor() {
  const [stats, setStats] = useState<AcceleratorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hailo-inference/status`;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);

        await supabase.from('accelerator_stats').insert({
          temperature: data.temperature,
          power_consumption: data.powerConsumption,
          utilization_percent: data.utilizationPercent,
          total_inferences: data.totalInferences,
          average_fps: data.averageFps,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
        <div className="text-slate-400">Loading accelerator stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
        <div className="text-red-400">Unable to connect to Hailo accelerator</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Accelerator Status</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-emerald-400">Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Thermometer className="w-5 h-5 text-orange-400" />}
          label="Temperature"
          value={`${stats.temperature.toFixed(1)}°C`}
          bgColor="bg-orange-500/10"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          label="Power"
          value={`${stats.powerConsumption.toFixed(2)}W`}
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-blue-400" />}
          label="Utilization"
          value={`${stats.utilizationPercent}%`}
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          label="Avg FPS"
          value={stats.averageFps.toFixed(1)}
          bgColor="bg-emerald-500/10"
        />
      </div>

      <div className="mt-6 pt-6 border-t border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Total Inferences Processed</span>
          <span className="text-white font-semibold text-lg">
            {stats.totalInferences.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}

function StatCard({ icon, label, value, bgColor }: StatCardProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className={`inline-flex p-2 rounded-lg ${bgColor} mb-2`}>
        {icon}
      </div>
      <div className="text-slate-400 text-sm mb-1">{label}</div>
      <div className="text-white text-xl font-semibold">{value}</div>
    </div>
  );
}
