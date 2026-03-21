import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const Forecasting = ({ forecastData }: { forecastData: any }) => {
  if (!forecastData) return <div className="h-64 border border-white/[0.04] rounded-2xl bg-[#0f0f11] animate-pulse"></div>;

  const trendIcon = forecastData.trend_direction === 'up' 
    ? <TrendingUp size={24} className="text-amber-500" /> 
    : forecastData.trend_direction === 'down' 
      ? <TrendingDown size={24} className="text-emerald-500" />
      : <Minus size={24} className="text-zinc-500" />;

  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl flex flex-col justify-between h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Target size={120} className="text-white" />
      </div>
      
      <div>
        <h2 className="text-lg font-light text-white flex items-center gap-2">
          Projected Spend
        </h2>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold text-[10px]">Based on 7-day run rate</p>
      </div>
      
      <div className="flex justify-between items-end mt-8">
         <div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Weekly Projection</div>
            <div className="text-4xl font-light text-white">${forecastData.projected_weekly?.toFixed(2) || '0.00'}</div>
         </div>
      </div>
      
      <div className="w-full h-px bg-white/5 my-6"></div>
      
      <div className="flex justify-between items-end">
         <div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Monthly Projection</div>
            <div className="text-3xl font-light text-zinc-400">${forecastData.projected_monthly?.toFixed(2) || '0.00'}</div>
         </div>
         <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            {trendIcon}
         </div>
      </div>
    </div>
  );
};
