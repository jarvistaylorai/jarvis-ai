"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Gauge, Zap, Coins } from "lucide-react";
import { checkBudget, MODEL_BUDGETS } from "@/lib/context/budgetEnforcer";

interface ContextPressureWidgetProps {
  workspaceId?: string;
  refreshInterval?: number; // ms
}

interface BudgetState {
  currentTokens: number;
  budgetTokens: number;
  percentUsed: number;
  pressureLevel: "low" | "medium" | "high" | "critical";
  estimatedCostUsd: number;
}

export function ContextPressureWidget({
  workspaceId = "business",
  refreshInterval = 5000,
}: ContextPressureWidgetProps) {
  const [budget, setBudget] = useState<BudgetState>({
    currentTokens: 0,
    budgetTokens: 100000,
    percentUsed: 0,
    pressureLevel: "low",
    estimatedCostUsd: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch budget status from SSE stream or API
  useEffect(() => {
    const fetchBudget = async () => {
      try {
        // Try to get from telemetry stream first
        const response = await fetch(`/api/dashboard?workspace=${workspaceId}`);
        if (!response.ok) throw new Error("Failed to fetch");
        
        const data = await response.json();
        
        // Calculate from context pressure if available
        const tokens = data.contextPressure?.tokens || 0;
        const model = data.currentModel || "kimi-k2.5";
        const budgetTokens = MODEL_BUDGETS[model]?.totalBudget || 100000;
        
        // Calculate budget status
        const percentUsed = (tokens / budgetTokens) * 100;
        let pressureLevel: BudgetState["pressureLevel"] = "low";
        if (percentUsed > 95) pressureLevel = "critical";
        else if (percentUsed > 85) pressureLevel = "high";
        else if (percentUsed > 60) pressureLevel = "medium";
        
        // Estimate cost (rough approximation)
        const costPer1kTokens = model.includes("claude") ? 0.003 : 
                               model.includes("gemini") ? 0.0005 : 0.0015;
        const estimatedCostUsd = (tokens / 1000) * costPer1kTokens;
        
        setBudget({
          currentTokens: tokens,
          budgetTokens,
          percentUsed,
          pressureLevel,
          estimatedCostUsd,
        });
        setIsLoading(false);
      } catch (error) {
        console.error("[ContextPressureWidget] Error fetching budget:", error);
        setIsLoading(false);
      }
    };

    fetchBudget();
    const interval = setInterval(fetchBudget, refreshInterval);
    return () => clearInterval(interval);
  }, [workspaceId, refreshInterval]);

  // Color coding based on pressure level
  const getPressureColor = () => {
    switch (budget.pressureLevel) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  const getProgressColor = () => {
    switch (budget.pressureLevel) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-green-500";
    }
  };

  const getPressureIcon = () => {
    switch (budget.pressureLevel) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />;
      case "high":
        return <Gauge className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <Zap className="h-5 w-5 text-yellow-500" />;
      default:
        return <Gauge className="h-5 w-5 text-green-500" />;
    }
  };

  const getRecommendation = () => {
    switch (budget.pressureLevel) {
      case "critical":
        return "Critical: Break task into sub-tasks or switch to Gemini";
      case "high":
        return "High: Consider pruning conversation history";
      case "medium":
        return "Moderate: Monitor for continued growth";
      default:
        return "Healthy: Operating within normal parameters";
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Context Pressure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPressureIcon()}
            Context Pressure
          </div>
          <span className={`text-xs font-bold uppercase ${getPressureColor()}`}>
            {budget.pressureLevel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Token Usage Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{budget.currentTokens.toLocaleString()} tokens</span>
            <span>{budget.budgetTokens.toLocaleString()} max</span>
          </div>
          <Progress
            value={Math.min(budget.percentUsed, 100)}
            className="h-2"
          >
            <div
              className={`h-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
            />
          </Progress>
          <div className="text-xs text-right text-muted-foreground">
            {budget.percentUsed.toFixed(1)}% used
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Coins className="h-3 w-3" />
            Est. Cost
          </div>
          <span className="font-mono">${budget.estimatedCostUsd.toFixed(4)}</span>
        </div>

        {/* Recommendation */}
        <div className="text-xs p-2 rounded bg-muted/50">
          <p className={`${budget.pressureLevel === "critical" ? "text-red-600" : "text-muted-foreground"}`}>
            {getRecommendation()}
          </p>
        </div>

        {/* Budget Breakdown */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <div className="flex justify-between">
            <span>System (reserved)</span>
            <span className="font-mono">10,000</span>
          </div>
          <div className="flex justify-between">
            <span>Available for tasks</span>
            <span className="font-mono">{(budget.budgetTokens - 10000).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
