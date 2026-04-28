import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * Stability AI API 키 단일 입력 모달.
 *
 * 단일 provider 운영 — OpenAI 칸 제거 (settingsStore가 자동 마이그레이션 처리).
 */
export default function ApiKeySettings({ onClose }: { onClose: () => void }) {
  const apiKey = useSettingsStore((s) => s.apiKey);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const removeApiKey = useSettingsStore((s) => s.removeApiKey);

  const [input, setInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  function handleSave() {
    setApiKey(input);
  }

  function handleRemove() {
    removeApiKey();
    setInput("");
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
      </div>
    </div>
  );
}
