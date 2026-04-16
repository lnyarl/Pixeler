import { useCanvasStore, type ToolType } from "@/stores/canvasStore";

const TOOLS: { type: ToolType; label: string }[] = [
  { type: "pen", label: "펜" },
  { type: "eraser", label: "지우개" },
  { type: "move", label: "이동" },
];

export default function ToolSelector() {
  const currentTool = useCanvasStore((s) => s.currentTool);
  const setCurrentTool = useCanvasStore((s) => s.setCurrentTool);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">도구</label>
      <div className="flex gap-1">
        {TOOLS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setCurrentTool(type)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              currentTool === type
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
