import { useGenerationStore } from "@/stores/generationStore";

export default function LoadingIndicator() {
  const status = useGenerationStore((s) => s.status);

  if (status !== "loading") return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span>생성 중...</span>
    </div>
  );
}
