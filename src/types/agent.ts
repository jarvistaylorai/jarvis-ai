export type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  status: "active" | "idle" | "error";
  load: "low" | "normal" | "high";
  layer: "founder" | "core" | "department" | "infrastructure" | "input" | "processing" | "output" | "meta" | string;
  current_task?: string | null;
  last_active_at: string;
};
