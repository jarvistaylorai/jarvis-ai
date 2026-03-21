import { FactoryPipeline } from "@/components/factory/FactoryPipeline";

export const metadata = {
  title: "Dev Pipeline - Jarvis AI",
  description: "Platform Factory View",
};

export default function PipelinePage() {
  return (
    <div className="h-full w-full bg-[#0a0f18] text-slate-200">
      <FactoryPipeline />
    </div>
  );
}
