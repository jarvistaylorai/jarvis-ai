import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const Forecasting = ({ forecastData }: { forecastData: Record<string, unknown> }) => {
  if (!forecastData) return <div className="h-64 border border-white/[0.04] rounded-2xl bg-[#0f0f11] animate-pulse"></div>;

  const trendIcon = forecastData.trend_direction === 'up' 
    ? <TrendingUp size={18} className="text-amber-500" /> 
    : forecastData.trend_direction === 'down' 
      ? <TrendingDown size={18} className="text-emerald-500" />
      : <Minus size={18} className="text-zinc-500" />;

  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl relative overflow-hidden group">
      <div className="absolute -top-4 -right-4 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Target size={100} className="text-white" />
      </div>
      
      <div>
        <h2 className="text-base font-light text-white flex items-center gap-2">
          Projected Spend
        </h2>
        <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest font-semibold">Based on 7-day run rate</p>
      </div>
      
      <div className="mt-6 flex flex-col gap-4">
        <div>
           <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Weekly</div>
           <div className="text-3xl font-light text-white">${forecastData.projected_weekly?.toFixed(2) || '0.00'}</div>
        </div>
        
        <div className="w-full h-px bg-white/5"></div>
        
        <div className="flex justify-between items-center">
           <div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Monthly</div>
              <div className="text-xl font-light text-zinc-400">${forecastData.projected_monthly?.toFixed(2) || '0.00'}</div>
           </div>
           <div className="p-2 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
              {trendIcon}
           </div>
        </div>
      </div>
    </div>
  );
};
