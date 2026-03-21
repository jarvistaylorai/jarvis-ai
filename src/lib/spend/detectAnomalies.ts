export function detectAnomalies(todaySpend: number, avg7dSpend: number) {
  const anomalies = [];

  // Ignore tiny spends to avoid noisy alerts
  if (todaySpend < 2.0) return anomalies;

  if (todaySpend > avg7dSpend * 1.5) {
    const increasePercent = Math.round(((todaySpend - avg7dSpend) / avg7dSpend) * 100);
    anomalies.push({
      id: "anomaly_" + Math.random().toString(36).substr(2, 9),
      type: "cost_spike",
      severity: increasePercent > 100 ? "CRITICAL" : "HIGH",
      message: `Spend spike detected: Today's spend ($${todaySpend.toFixed(2)}) is ${increasePercent}% higher than the 7-day average ($${avg7dSpend.toFixed(2)}).`,
      timestamp: new Date().toISOString()
    });
  }

  return anomalies;
}
