import { useGenerationStore } from "@/stores/generationStore";

export default function PromptInput() {
  const prompt = useGenerationStore((s) => s.prompt);
  const setPrompt = useGenerationStore((s) => s.setPrompt);
  const count = useGenerationStore((s) => s.count);
  const setCount = useGenerationStore((s) => s.setCount);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">프롬프트</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="만들고 싶은 스프라이트를 설명하세요..."
        rows={4}
        className="px-2 py-1.5 text-sm bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">초안 수:</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`w-6 h-6 text-xs rounded transition-colors ${
                count === n
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
