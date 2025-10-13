import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Thermometer, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemHealth {
  overall: 'good' | 'warning' | 'critical';
  temperature: { value: number; status: string };
  power: { value: number; status: string };
  utilization: { value: number; status: string };
  memory: { value: number; status: string };
  database: { connected: boolean; latency: number };
  hailo: { connected: boolean; status: string };
}

export function SystemDiagnostics() {
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'good',
    temperature: { value: 0, status: 'normal' },
    power: { value: 0, status: 'normal' },
    utilization: { value: 0, status: 'normal' },
    memory: { value: 0, status: 'normal' },
    database: { connected: false, latency: 0 },
    hailo: { connected: false, status: 'unknown' },
  });

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    const newHealth: SystemHealth = {
      overall: 'good',
      temperature: { value: 0, status: 'normal' },
      power: { value: 0, status: 'normal' },
      utilization: { value: 0, status: 'normal' },
      memory: { value: 0, status: 'normal' },
      database: { connected: false, latency: 0 },
      hailo: { connected: false, status: 'unknown' },
    };

    const dbStart = Date.now();
    const { data: stats, error: dbError } = await supabase
      .from('accelerator_stats')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(1);

    newHealth.database.latency = Date.now() - dbStart;
    newHealth.database.connected = !dbError;

    if (!dbError && stats && stats.length > 0) {
      const latestStats = stats[0];

      newHealth.temperature.value = latestStats.temperature;
      if (latestStats.temperature > 85) {
        newHealth.temperature.status = 'critical';
        addLog('CRITICAL: High temperature detected');
      } else if (latestStats.temperature > 75) {
        newHealth.temperature.status = 'warning';
        addLog('WARNING: Temperature elevated');
      } else {
        newHealth.temperature.status = 'normal';
      }

      newHealth.power.value = latestStats.power_consumption;
      if (latestStats.power_consumption > 12) {
        newHealth.power.status = 'warning';
        addLog('WARNING: High power consumption');
      } else {
        newHealth.power.status = 'normal';
      }

      newHealth.utilization.value = latestStats.utilization_percent;
      newHealth.utilization.status = 'normal';

      newHealth.hailo.connected = true;
      newHealth.hailo.status = 'operational';
    }

    try {
      const memResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hailo-inference/status`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (memResponse.ok) {
        const systemData = await memResponse.json();
        newHealth.memory.value = systemData.memoryUsage || 0;
      }
    } catch {
      newHealth.memory.value = 0;
    }

    newHealth.memory.status = newHealth.memory.value > 90 ? 'warning' : 'normal';

    if (
      newHealth.temperature.status === 'critical' ||
      newHealth.power.status === 'critical' ||
      !newHealth.database.connected ||
      !newHealth.hailo.connected
    ) {
      newHealth.overall = 'critical';
    } else if (
      newHealth.temperature.status === 'warning' ||
      newHealth.power.status === 'warning' ||
      newHealth.memory.status === 'warning'
    ) {
      newHealth.overall = 'warning';
    }

    setHealth(newHealth);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-400 bg-red-500/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'normal':
      case 'operational':
        return 'text-emerald-400 bg-emerald-500/20';
      default:
        return 'text-slate-400 bg-slate-600/50';
    }
  };

  const getOverallStatusIcon = () => {
    switch (health.overall) {
      case 'good':
        return <CheckCircle className="w-6 h-6 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'critical':
        return <AlertTriangle className="w-6 h-6 text-red-400" />;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">System Diagnostics</h2>
        </div>

        <div className="flex items-center gap-3">
          {getOverallStatusIcon()}
          <span className={`px-3 py-1 rounded-lg font-medium capitalize ${getStatusColor(health.overall)}`}>
            {health.overall}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center gap-3 mb-3">
            <Thermometer className="w-5 h-5 text-orange-400" />
            <span className="text-slate-300 font-medium">Temperature</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
              {health.temperature.value.toFixed(1)}°C
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(health.temperature.status)}`}>
              {health.temperature.status}
            </span>
          </div>
          <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                health.temperature.status === 'critical'
                  ? 'bg-red-500'
                  : health.temperature.status === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((health.temperature.value / 100) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-slate-300 font-medium">Power</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
              {health.power.value.toFixed(2)}W
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(health.power.status)}`}>
              {health.power.status}
            </span>
          </div>
          <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                health.power.status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((health.power.value / 15) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span className="text-slate-300 font-medium">Utilization</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
              {health.utilization.value.toFixed(0)}%
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(health.utilization.status)}`}>
              {health.utilization.status}
            </span>
          </div>
          <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${health.utilization.value}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center gap-3 mb-3">
            <HardDrive className="w-5 h-5 text-purple-400" />
            <span className="text-slate-300 font-medium">Memory</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
              {health.memory.value.toFixed(0)}%
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(health.memory.status)}`}>
              {health.memory.status}
            </span>
          </div>
          <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                health.memory.status === 'warning' ? 'bg-yellow-500' : 'bg-purple-500'
              }`}
              style={{ width: `${health.memory.value}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Database</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
              {health.database.latency}ms
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              health.database.connected ? 'text-emerald-400 bg-emerald-500/20' : 'text-red-400 bg-red-500/20'
            }`}>
              {health.database.connected ? 'connected' : 'disconnected'}
            </span>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span className="text-slate-300 font-medium">Hailo AI</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-white capitalize">
              {health.hailo.status}
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              health.hailo.connected ? 'text-emerald-400 bg-emerald-500/20' : 'text-red-400 bg-red-500/20'
            }`}>
              {health.hailo.connected ? 'connected' : 'disconnected'}
            </span>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <h3 className="text-white font-medium mb-3">System Logs</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="text-sm font-mono text-slate-400 hover:text-slate-300 transition-colors"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
