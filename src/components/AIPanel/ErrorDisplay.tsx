import { useGenerationStore } from "@/stores/generationStore";

export default function ErrorDisplay() {
  const status = useGenerationStore((s) => s.status);
  const errorMessage = useGenerationStore((s) => s.errorMessage);

  if (status !== "error") return null;

  return (
    <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-300">
      {errorMessage}
    </div>
  );
}
