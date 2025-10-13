import { useState, useEffect } from 'react';
import { MapPin, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeatmapData {
  x: number;
  y: number;
  intensity: number;
  class: string;
}

export function DetectionHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatmapData();
  }, []);

  const loadHeatmapData = async () => {
    setLoading(true);

    try {
      const { data: results } = await supabase
        .from('inference_results')
        .select('result_data')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!results) return;

      const detectionMap = new Map<string, HeatmapData>();
      const detectedClasses = new Set<string>();

      results.forEach(result => {
        const detections = Array.isArray(result.result_data) ? result.result_data : [];

        detections.forEach((detection: any) => {
          if (!detection.bbox || detection.bbox.length < 4) return;

          const [x1, y1, x2, y2] = detection.bbox;
          const centerX = Math.round((x1 + x2) / 2 / 50) * 50;
          const centerY = Math.round((y1 + y2) / 2 / 50) * 50;
          const key = `${centerX}-${centerY}-${detection.class}`;

          detectedClasses.add(detection.class);

          if (detectionMap.has(key)) {
            const existing = detectionMap.get(key)!;
            detectionMap.set(key, {
              ...existing,
              intensity: existing.intensity + 1,
            });
          } else {
            detectionMap.set(key, {
              x: centerX,
              y: centerY,
              intensity: 1,
              class: detection.class,
            });
          }
        });
      });

      setHeatmapData(Array.from(detectionMap.values()));
      setClasses(Array.from(detectedClasses).sort());
    } catch (error) {
      console.error('Error loading heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (selectedClass === 'all') return heatmapData;
    return heatmapData.filter(d => d.class === selectedClass);
  };

  const getMaxIntensity = () => {
    const filtered = getFilteredData();
    return filtered.length > 0 ? Math.max(...filtered.map(d => d.intensity)) : 1;
  };

  const getIntensityColor = (intensity: number) => {
    const maxIntensity = getMaxIntensity();
    const normalized = intensity / maxIntensity;

    if (normalized > 0.75) return 'bg-red-500';
    if (normalized > 0.5) return 'bg-orange-500';
    if (normalized > 0.25) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getIntensityOpacity = (intensity: number) => {
    const maxIntensity = getMaxIntensity();
    const normalized = intensity / maxIntensity;
    return Math.max(0.3, Math.min(1, normalized));
  };

  const classColors: Record<string, string> = {
    person: 'bg-blue-500',
    car: 'bg-red-500',
    truck: 'bg-orange-500',
    dog: 'bg-purple-500',
    cat: 'bg-pink-500',
    default: 'bg-emerald-500',
  };

  const getClassColor = (className: string) => {
    return classColors[className.toLowerCase()] || classColors.default;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg">
            <MapPin className="w-5 h-5 text-rose-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Detection Heatmap</h2>
        </div>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-rose-500 focus:outline-none"
        >
          <option value="all">All Classes</option>
          {classes.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading heatmap data...</div>
      ) : heatmapData.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No detection data available</p>
          <p className="text-sm text-slate-500">
            Run some inference tasks to generate heatmap data
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ height: '480px' }}>
            <svg width="100%" height="100%" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet">
              <rect width="640" height="480" fill="#0f172a" />

              <defs>
                <radialGradient id="heatGradient">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>

              {getFilteredData().map((point, idx) => (
                <g key={idx}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={30}
                    fill="url(#heatGradient)"
                    className={getIntensityColor(point.intensity)}
                    opacity={getIntensityOpacity(point.intensity)}
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={8}
                    className={getClassColor(point.class)}
                    opacity="0.9"
                  />

                  <text
                    x={point.x}
                    y={point.y - 15}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    opacity={getIntensityOpacity(point.intensity)}
                  >
                    {point.intensity}
                  </text>
                </g>
              ))}

              <g opacity="0.3">
                {[0, 160, 320, 480, 640].map(x => (
                  <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="480" stroke="#475569" strokeWidth="1" />
                ))}
                {[0, 120, 240, 360, 480].map(y => (
                  <line key={`h-${y}`} x1="0" y1={y} x2="640" y2={y} stroke="#475569" strokeWidth="1" />
                ))}
              </g>
            </svg>

            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">Intensity Scale</div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-xs text-slate-300">High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-xs text-slate-300">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-xs text-slate-300">Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                    <span className="text-xs text-slate-300">Minimal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {classes.map(cls => {
              const classData = heatmapData.filter(d => d.class === cls);
              const total = classData.reduce((sum, d) => sum + d.intensity, 0);

              return (
                <div
                  key={cls}
                  className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded ${getClassColor(cls)}`}></div>
                    <span className="text-white font-medium capitalize">{cls}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-white">{total}</div>
                    <div className="text-xs text-slate-400">detections</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <div className="font-medium mb-1">Heatmap Analysis</div>
                <p className="text-blue-300/80">
                  This visualization shows where objects are most frequently detected across all inference results.
                  Brighter areas indicate higher detection frequency. Use the class filter to focus on specific object types.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
