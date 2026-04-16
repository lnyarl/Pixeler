import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProviderType } from "@/services/ai/types";

const PROVIDERS: { type: AIProviderType; label: string }[] = [
  { type: "openai", label: "OpenAI" },
  { type: "stability", label: "Stability" },
];

export default function ProviderSelector() {
  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const setSelectedProvider = useSettingsStore((s) => s.setSelectedProvider);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">AI 제공자</label>
      <div className="flex gap-1">
        {PROVIDERS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setSelectedProvider(type)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              selectedProvider === type
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
