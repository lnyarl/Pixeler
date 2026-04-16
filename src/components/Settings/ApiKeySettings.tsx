import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProviderType } from "@/services/ai/types";

const PROVIDERS: { type: AIProviderType; label: string }[] = [
  { type: "openai", label: "OpenAI" },
  { type: "stability", label: "Stability AI" },
];

export default function ApiKeySettings({ onClose }: { onClose: () => void }) {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const removeApiKey = useSettingsStore((s) => s.removeApiKey);

  const [inputs, setInputs] = useState<Record<string, string>>({
    openai: apiKeys.openai,
    stability: apiKeys.stability,
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  function handleSave(provider: AIProviderType) {
    setApiKey(provider, inputs[provider] ?? "");
  }

  function handleRemove(provider: AIProviderType) {
    removeApiKey(provider);
    setInputs((prev) => ({ ...prev, [provider]: "" }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">API 키 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2 text-xs text-yellow-300">
          ⚠ API 키는 브라우저 로컬 스토리지에 저장됩니다. 공용 컴퓨터에서는
          사용 후 키를 삭제해주세요.
        </div>

        {PROVIDERS.map(({ type, label }) => (
          <div key={type} className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">{label}</label>
            <div className="flex gap-1">
              <input
                type={showKeys[type] ? "text" : "password"}
                value={inputs[type] ?? ""}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [type]: e.target.value }))
                }
                placeholder="API 키 입력"
                className="flex-1 px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() =>
                  setShowKeys((prev) => ({ ...prev, [type]: !prev[type] }))
                }
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                title={showKeys[type] ? "숨기기" : "보기"}
              >
                {showKeys[type] ? "숨김" : "보기"}
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleSave(type)}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                저장
              </button>
              {apiKeys[type] && (
                <button
                  onClick={() => handleRemove(type)}
                  className="px-2 py-1 text-xs bg-red-800 text-red-200 rounded hover:bg-red-700"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
