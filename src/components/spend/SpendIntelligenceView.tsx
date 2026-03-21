import React, { useState, useEffect } from 'react';
import { GlobalSpendOverview } from './GlobalSpendOverview';
import { SpendOverTimeGraph } from './SpendOverTimeGraph';
import { SpendByAgentTable } from './SpendByAgentTable';
import { SpendByModelCards } from './SpendByModelCards';
import { CostAnomalies } from './CostAnomalies';
import { CostBreakdownTable } from './CostBreakdownTable';
import { BudgetControls } from './BudgetControls';
import { Forecasting } from './Forecasting';
import { Download, Bell, Settings } from 'lucide-react';

export const SpendIntelligenceView = ({ activeWorkspace = 'business' }: any) => {
  const [overview, setOverview] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [oRes, aRes, mRes, lRes, fRes, tRes, anRes] = await Promise.all([
          fetch(`/api/spend/overview?workspace=${activeWorkspace}`),
          fetch(`/api/spend/by-agent?workspace=${activeWorkspace}`),
          fetch(`/api/spend/by-model?workspace=${activeWorkspace}`),
          fetch(`/api/spend/logs?limit=50&workspace=${activeWorkspace}`),
          fetch(`/api/spend/forecast?workspace=${activeWorkspace}`),
          fetch(`/api/spend/timeseries?workspace=${activeWorkspace}`),
          fetch(`/api/spend/anomalies?workspace=${activeWorkspace}`)
        ]);
        
        setOverview(await oRes.json());
        setAgentStats(await aRes.json());
        setModelStats(await mRes.json());
        setLogs(await lRes.json());
        setForecast(await fRes.json());
        setTimeseries(await tRes.json());
        setAnomalies(await anRes.json());
      } catch (err) {
        console.error('Failed to load spend data', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [activeWorkspace]);

  return (
    <div className="flex flex-col gap-8 pb-20 fade-in animate-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
             <span className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/20">🧠</span>
             Spend Intelligence
          </h1>
          <p className="text-sm text-zinc-500 mt-2">Monitor, analyze, and optimize AI execution costs</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors uppercase tracking-widest">
             <Download size={14} /> Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors uppercase tracking-widest">
             <Bell size={14} /> Set Alerts
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest">
             <Settings size={14} /> Budget Settings
          </button>
        </div>
      </div>

      <GlobalSpendOverview stats={overview} />
      
      <div className="grid grid-cols-12 gap-6">
         <div className="col-span-8 flex flex-col gap-6">
            <SpendOverTimeGraph timeseriesData={timeseries} />
            <SpendByAgentTable agentData={agentStats} />
            <SpendByModelCards modelData={modelStats} />
            <CostBreakdownTable logs={logs} />
         </div>
         <div className="col-span-4 flex flex-col gap-6">
            <CostAnomalies anomalies={anomalies || []} />
            <Forecasting forecastData={forecast} />
            <BudgetControls />
         </div>
      </div>
    </div>
  );
};
