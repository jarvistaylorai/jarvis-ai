"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { quickRoute, MODEL_BUDGETS } from "@/lib/models/quickRouter";
import { Cpu, Zap, Scale, AlertCircle } from "lucide-react";

interface ModelSelectorProps {
  agentId?: string;
  currentModel?: string;
  estimatedTokens?: number;
  taskType?: "coding" | "analysis" | "conversation";
  onModelChange?: (model: string) => void;
  workspaceId?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  budget: number;
  costPer1k: number;
  bestFor: string[];
  icon: React.ReactNode;
  color: string;
}

const MODELS: ModelInfo[] = [
  {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    budget: MODEL_BUDGETS["kimi-k2.5"].totalBudget,
    costPer1k: 0.0015,
    bestFor: ["General tasks", "Fast responses", "Balanced"],
    icon: <Zap className="h-4 w-4" />,
    color: "bg-blue-500",
  },
  {
    id: "claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet",
    budget: MODEL_BUDGETS["claude-3.7-sonnet"].totalBudget,
    costPer1k: 0.003,
    bestFor: ["Coding", "Complex reasoning", "High accuracy"],
    icon: <Cpu className="h-4 w-4" />,
    color: "bg-purple-500",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    budget: MODEL_BUDGETS["gemini-1.5-pro"].totalBudget,
    costPer1k: 0.0005,
    bestFor: ["Large context", "Document analysis", "Cost efficient"],
    icon: <Scale className="h-4 w-4" />,
    color: "bg-green-500",
  },
];

export function ModelSelector({
    agentId,
  currentModel = "kimi-k2.5",
  estimatedTokens = 0,
  taskType = "conversation",
  onModelChange,
    workspaceId = "business",
}: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [recommendedModel, setRecommendedModel] = useState(currentModel);
  const [routeInfo, setRouteInfo] = useState({
    reason: "",
    canHandle: true,
  });

  // Calculate recommended model
  useEffect(() => {
    const route = quickRoute({
      estimatedTokens,
      taskType,
      preferredModel: currentModel,
    });

    Promise.resolve().then(() => {
      setRecommendedModel(route.model);
      setRouteInfo({
        reason: route.reason,
        canHandle: route.canHandle,
      });
    });

    // If auto-routing and model changed, notify parent
    if (route.model !== selectedModel && onModelChange) {
      onModelChange(route.model);
    }
    }, [estimatedTokens, taskType, currentModel]);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    if (onModelChange) {
      onModelChange(modelId);
    }
  };

  const getModelById = (id: string) => MODELS.find((m) => m.id === id) || MODELS[0];

  const currentModelInfo = getModelById(selectedModel);
  const recommendedModelInfo = getModelById(recommendedModel);

  const usagePercent = (estimatedTokens / currentModelInfo.budget) * 100;
  const isOverCapacity = usagePercent > 95;
  const shouldRecommendChange = selectedModel !== recommendedModel;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          Model Selector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Model Select */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Active Model</label>
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                {currentModelInfo.icon}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    {model.icon}
                    <span>{model.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Usage Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Context Usage</span>
            <span className={`font-mono ${isOverCapacity ? "text-red-500" : ""}`}>
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                usagePercent > 95
                  ? "bg-red-500"
                  : usagePercent > 80
                  ? "bg-orange-500"
                  : usagePercent > 60
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {estimatedTokens.toLocaleString()} / {currentModelInfo.budget.toLocaleString()} tokens
          </div>
        </div>

        {/* Recommendation Alert */}
        {shouldRecommendChange && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-600">
                  Recommended: Switch to {recommendedModelInfo.name}
                </p>
                <p className="text-xs text-muted-foreground">{routeInfo.reason}</p>
                <button
                  onClick={() => handleModelChange(recommendedModel)}
                  className="text-xs text-yellow-600 hover:underline mt-1"
                >
                  Switch now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Model Details */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Model Capabilities</p>
          <div className="flex flex-wrap gap-1">
            {currentModelInfo.bestFor.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>Cost (per 1K tokens)</span>
            <span className="font-mono">${currentModelInfo.costPer1k.toFixed(4)}</span>
          </div>
        </div>

        {/* Routing Logic Info */}
        <div className="text-xs text-muted-foreground pt-2">
          <span className="font-medium">Auto-routing: </span>
          {taskType === "coding"
            ? "Prioritizes coding-capable models"
            : taskType === "analysis"
            ? "Prioritizes large context models"
            : "Balanced selection"}
        </div>
      </CardContent>
    </Card>
  );
}
