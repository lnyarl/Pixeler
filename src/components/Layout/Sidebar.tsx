interface SidebarProps {
  children?: React.ReactNode;
  disabled?: boolean;
}

export default function Sidebar({ children, disabled }: SidebarProps) {
  return (
    <aside
      className={`w-60 bg-gray-800 border-r border-gray-700 flex flex-col p-3 gap-3 overflow-y-auto ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
      aria-disabled={disabled}
    >
      {children ?? (
        <p className="text-gray-500 text-sm">도구 패널</p>
      )}
    </aside>
  );
}
