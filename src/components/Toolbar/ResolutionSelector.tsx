import { useState } from "react";
import {
  useCanvasStore,
  RESOLUTION_PRESETS,
  isValidResolution,
} from "@/stores/canvasStore";

export default function ResolutionSelector() {
  const resolution = useCanvasStore((s) => s.resolution);
  const setResolution = useCanvasStore((s) => s.setResolution);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState("");

  const isPreset = (RESOLUTION_PRESETS as readonly number[]).includes(
    resolution
  );

  function handlePresetClick(preset: number) {
    setResolution(preset);
    setCustomInput("");
    setError("");
  }

  function handleCustomSubmit() {
    const value = parseInt(customInput, 10);
    if (isNaN(value)) {
      setError("숫자를 입력해주세요");
      return;
    }
    if (!isValidResolution(value)) {
      setError("8~128 범위의 정수를 입력해주세요");
      return;
    }
    setResolution(value);
    setError("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">해상도</label>

      <div className="flex gap-1">
        {RESOLUTION_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              resolution === preset
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {preset}x{preset}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        <input
          type="number"
          min={8}
          max={128}
          placeholder="커스텀"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
          className={`flex-1 px-2 py-1 text-xs bg-gray-700 rounded border ${
            error ? "border-red-500" : "border-gray-600"
          } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
        />
        <button
          onClick={handleCustomSubmit}
          className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          적용
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!isPreset && (
        <p className="text-xs text-gray-500">
          현재: {resolution}x{resolution}
        </p>
      )}
    </div>
  );
}
