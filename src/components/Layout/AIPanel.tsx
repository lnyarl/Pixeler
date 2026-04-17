import { useResizable } from "@/hooks/useResizable";

interface AIPanelProps {
  children?: React.ReactNode;
}

export default function AIPanel({ children }: AIPanelProps) {
  const { size, handleMouseDown } = useResizable({
    defaultSize: 320,
    minSize: 240,
    maxSize: Infinity,
    direction: "right",
  });

  return (
    <div className="relative flex-shrink-0 flex" style={{ width: size }}>
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-10"
      />
      <aside className="flex-1 bg-gray-800 border-l border-gray-700 flex flex-col p-3 gap-3 overflow-auto">
        {children ?? <p className="text-gray-500 text-sm">AI 패널</p>}
      </aside>
    </div>
  );
}
