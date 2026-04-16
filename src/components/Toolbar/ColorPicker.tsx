import { useCanvasStore } from "@/stores/canvasStore";

export default function ColorPicker() {
  const currentColor = useCanvasStore((s) => s.currentColor);
  const setCurrentColor = useCanvasStore((s) => s.setCurrentColor);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">색상</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-transparent"
        />
        <span className="text-xs text-gray-400 font-mono">{currentColor}</span>
      </div>
    </div>
  );
}
