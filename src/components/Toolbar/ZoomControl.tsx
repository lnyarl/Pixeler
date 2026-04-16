interface ZoomControlProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  width: number;
  height: number;
}

export default function ZoomControl({
  scale,
  onZoomIn,
  onZoomOut,
  width,
  height,
}: ZoomControlProps) {
  const percent = Math.round(scale * 100);

  return (
    <div className="absolute bottom-3 right-3 bg-gray-800/80 px-2 py-1 rounded text-xs text-gray-400 flex items-center gap-1">
      <button
        onClick={onZoomOut}
        className="px-1 hover:text-white transition-colors"
      >
        −
      </button>
      <span>
        {percent}% ({width}×{height})
      </span>
      <button
        onClick={onZoomIn}
        className="px-1 hover:text-white transition-colors"
      >
        +
      </button>
    </div>
  );
}
