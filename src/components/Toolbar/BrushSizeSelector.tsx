import { useCanvasStore } from "@/stores/canvasStore";

const SIZES = [1, 2, 3, 4];

export default function BrushSizeSelector() {
  const brushSize = useCanvasStore((s) => s.brushSize);
  const setBrushSize = useCanvasStore((s) => s.setBrushSize);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">
        브러시 크기: {brushSize}px
      </label>
      <div className="flex gap-1">
        {SIZES.map((size) => (
          <button
            key={size}
            onClick={() => setBrushSize(size)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              brushSize === size
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}
