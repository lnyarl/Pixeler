import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * API / 연결 설정 모달.
 *
 * Provider 선택 토글 (Stability | Local SD) → 선택에 따라 해당 섹션 표시.
 * - Stability: API 키 입력.
 * - Local SD: URL, LoRA 이름, LoRA 가중치.
 */
export default function ApiKeySettings({ onClose }: { onClose: () => void }) {
  const apiKey = useSettingsStore((s) => s.apiKey);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const removeApiKey = useSettingsStore((s) => s.removeApiKey);
  const provider = useSettingsStore((s) => s.provider);
  const setProvider = useSettingsStore((s) => s.setProvider);
  const localSD = useSettingsStore((s) => s.localSD);
  const setLocalSD = useSettingsStore((s) => s.setLocalSD);

  const [input, setInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const [localUrl, setLocalUrl] = useState(localSD.url);
  const [localLoraName, setLocalLoraName] = useState(localSD.loraName);
  const [localLoraWeight, setLocalLoraWeight] = useState(localSD.loraWeight);

  function handleSave() {
    setApiKey(input);
    setLocalSD({
      url: localUrl,
      loraName: localLoraName,
      loraWeight: localLoraWeight,
    });
  }

  function handleRemove() {
    removeApiKey();
    setInput("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">API / 연결 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2 text-xs text-yellow-300">
          API 키는 브라우저 로컬 스토리지에 저장됩니다. 공용 컴퓨터에서는
          사용 후 키를 삭제해주세요.
        </div>

        {/* Provider 선택 토글 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 font-medium">
            AI 제공자
          </label>
          <div className="flex rounded overflow-hidden border border-gray-600">
            <button
              onClick={() => setProvider("stability")}
              className={`flex-1 px-3 py-1.5 text-xs transition-colors ${
                provider === "stability"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Stability AI
            </button>
            <button
              onClick={() => setProvider("localSD")}
              className={`flex-1 px-3 py-1.5 text-xs transition-colors ${
                provider === "localSD"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Local SD
            </button>
          </div>
        </div>

        {/* Stability API 키 섹션 */}
        {provider === "stability" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">
              Stability API 키
            </label>
            <div className="flex gap-1">
              <input
                type={showKey ? "text" : "password"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="API 키 입력"
                className="flex-1 px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                title={showKey ? "숨기기" : "보기"}
              >
                {showKey ? "숨김" : "보기"}
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                저장
              </button>
              {apiKey && (
                <button
                  onClick={handleRemove}
                  className="px-2 py-1 text-xs bg-red-800 text-red-200 rounded hover:bg-red-700"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        )}

        {/* Local SD 설정 섹션 */}
        {provider === "localSD" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">
                서버 URL
              </label>
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="http://localhost:7861"
                className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium">
                LoRA 이름 (확장자 없이, 빈칸이면 미사용)
              </label>
              <input
                type="text"
                value={localLoraName}
                onChange={(e) => setLocalLoraName(e.target.value)}
                placeholder="pixel-art-xl"
                className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 font-medium">
                  LoRA 가중치
                </label>
                <span className="text-xs text-gray-300 font-mono">
                  {localLoraWeight.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.1}
                value={localLoraWeight}
                onChange={(e) =>
                  setLocalLoraWeight(parseFloat(e.target.value))
                }
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0.1</span>
                <span>1.0</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              저장
            </button>

            <div className="text-[10px] text-gray-500">
              stable-diffusion.cpp HTTP 서버 — POST /txt2img, POST /img2img
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
