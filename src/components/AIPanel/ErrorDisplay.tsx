import { useGenerationStore } from "@/stores/generationStore";

interface ErrorDisplayProps {
  onRetry?: () => void;
}

export default function ErrorDisplay({ onRetry }: ErrorDisplayProps) {
  const status = useGenerationStore((s) => s.status);
  const errorMessage = useGenerationStore((s) => s.errorMessage);
  const reset = useGenerationStore((s) => s.reset);

  if (status !== "error") return null;

  return (
    <div className="bg-red-900/30 border border-red-700 rounded p-2 text-xs text-red-300 flex flex-col gap-1">
      <span>{errorMessage}</span>
      <div className="flex gap-1">
        <button
          onClick={() => {
            reset();
            onRetry?.();
          }}
          className="px-2 py-1 bg-red-800 text-red-200 rounded hover:bg-red-700 text-xs"
        >
          재시도
        </button>
        <button
          onClick={reset}
          className="px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-xs"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
