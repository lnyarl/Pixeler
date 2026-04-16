import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProviderType, ProviderCapabilities } from "@/services/ai/types";

const PROVIDERS: {
  type: AIProviderType;
  label: string;
  capabilities: ProviderCapabilities;
}[] = [
  {
    type: "openai",
    label: "OpenAI",
    capabilities: {
      supportsInpainting: true,
      supportsMultipleOutputs: true,
      supportsImageReference: true,
    },
  },
  {
    type: "stability",
    label: "Stability",
    capabilities: {
      supportsInpainting: true,
      supportsMultipleOutputs: false,
      supportsImageReference: true,
    },
  },
];

export default function ProviderSelector() {
  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const setSelectedProvider = useSettingsStore((s) => s.setSelectedProvider);

  const current = PROVIDERS.find((p) => p.type === selectedProvider);

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
      {current && !current.capabilities.supportsMultipleOutputs && (
        <p className="text-xs text-yellow-400">
          ⚠ 복수 초안 생성 시 순차 호출 (API 비용 증가)
        </p>
      )}
    </div>
  );
}

/** 현재 선택된 제공자의 capabilities 조회용 */
export function getProviderCapabilities(
  provider: AIProviderType
): ProviderCapabilities {
  return (
    PROVIDERS.find((p) => p.type === provider)?.capabilities ?? {
      supportsInpainting: false,
      supportsMultipleOutputs: false,
      supportsImageReference: false,
    }
  );
}
