import { useState } from "react";
import {
  useCanvasStore,
  RESOLUTION_PRESETS,
  isValidResolution,
} from "@/stores/canvasStore";

export default function ResolutionSelector() {
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
  const linked = useCanvasStore((s) => s.linked);
  const dirty = useCanvasStore((s) => s.dirty);
  const setResolution = useCanvasStore((s) => s.setResolution);
  const setLinked = useCanvasStore((s) => s.setLinked);

  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [error, setError] = useState("");

  function confirmChange(newW: number, newH: number) {
    if (dirty) {
      const shrinking = newW < width || newH < height;
      const msg = shrinking
        ? `해상도를 ${newW}×${newH}로 줄이면 왼쪽 위를 기준으로 잘립니다. 변경하시겠습니까?`
        : `해상도를 ${newW}×${newH}로 변경합니다. 기존 그림은 왼쪽 위에 유지됩니다. 변경하시겠습니까?`;
      if (!window.confirm(msg)) return;
    }
    setResolution(newW, newH);
    setCustomW("");
    setCustomH("");
    setError("");
  }

  function handlePresetClick(preset: number) {
    confirmChange(preset, preset);
  }

  function handleCustomSubmit() {
    const w = parseInt(customW, 10);
    const h = linked ? w : parseInt(customH, 10);

    if (isNaN(w) || (!linked && isNaN(h))) {
      setError("숫자를 입력해주세요");
      return;
    }
    if (!isValidResolution(w) || !isValidResolution(h)) {
      setError("8~128 범위의 정수를 입력해주세요");
      return;
    }
    confirmChange(w, h);
  }

  const isPreset =
    width === height &&
    (RESOLUTION_PRESETS as readonly number[]).includes(width);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 font-medium">해상도</label>
      </div>

      <div className="flex gap-1">
        {RESOLUTION_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              width === preset && height === preset
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {preset}x{preset}
          </button>
        ))}
      </div>

      <div className="flex gap-1 items-center">
        <button
          onClick={() => setLinked(!linked)}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            linked
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
          title={linked ? "가로세로 연동 (클릭하여 분리)" : "가로세로 분리 (클릭하여 연동)"}
        >
          {linked ? "🔗" : "↔"}
        </button>
        <input
          type="number"
          min={8}
          max={128}
          placeholder={linked ? "크기" : "가로"}
          value={customW}
          onChange={(e) => {
            setCustomW(e.target.value);
            if (linked) setCustomH(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
          className={`flex-1 px-2 py-1 text-xs bg-gray-700 rounded border ${
            error ? "border-red-500" : "border-gray-600"
          } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
        />
        {!linked && (
          <>
            <span className="text-gray-500 text-xs">×</span>
            <input
              type="number"
              min={8}
              max={128}
              placeholder="세로"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
              className={`flex-1 px-2 py-1 text-xs bg-gray-700 rounded border ${
                error ? "border-red-500" : "border-gray-600"
              } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500`}
            />
          </>
        )}
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
          현재: {width}×{height}
        </p>
      )}
    </div>
  );
}
