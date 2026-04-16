import { useResizable } from "@/hooks/useResizable";

interface SidebarProps {
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function Sidebar({ children, disabled }: SidebarProps) {
  const { size, handleMouseDown } = useResizable({
    defaultSize: 240,
    minSize: 180,
    maxSize: 360,
    direction: "left",
  });

  return (
    <div className="relative flex-shrink-0 flex" style={{ width: size }}>
      <aside
        className={`flex-1 bg-gray-800 border-r border-gray-700 flex flex-col p-3 gap-3 overflow-auto ${
          disabled ? "opacity-50 pointer-events-none" : ""
        }`}
        aria-disabled={disabled}
      >
        {children ?? <p className="text-gray-500 text-sm">도구 패널</p>}
      </aside>
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-10"
      />
    </div>
  );
}
