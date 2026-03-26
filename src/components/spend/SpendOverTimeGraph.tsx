import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SpendOverTimeGraph = ({ timeseriesData }: { timeseriesData: unknown[] }) => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');

  const filteredData = React.useMemo(() => {
    if (!timeseriesData) return [];
    if (timeframe === '24h') return timeseriesData.slice(-1);
    if (timeframe === '7d') return timeseriesData.slice(-7);
    return timeseriesData.slice(-30);
  }, [timeseriesData, timeframe]);

  if (!timeseriesData) {
    return <div className="h-64 border border-white/[0.04] rounded-2xl bg-[#0f0f11] animate-pulse"></div>;
  }

  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-light text-white">Spend Over Time</h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold text-[10px]">Cost Trend Analysis</p>
        </div>
        <div className="flex gap-1 bg-[#050505] p-1 rounded-lg border border-white/5">
          {(['24h', '7d', '30d'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-colors ${
                timeframe === tf ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={10} 
              tickMargin={10} 
              axisLine={false}
              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={10} 
              tickMargin={10} 
              axisLine={false}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0a0a0b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: Record<string, unknown>) => [`$${Number(value).toFixed(2)}`, 'Spend']}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Line 
              type="monotone" 
              dataKey="spend" 
              stroke="#818cf8" 
              strokeWidth={2}
              dot={{ fill: '#818cf8', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#fff' }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
