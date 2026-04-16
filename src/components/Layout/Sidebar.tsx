interface SidebarProps {
  children?: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-60 bg-gray-800 border-r border-gray-700 flex flex-col p-3 gap-3 overflow-y-auto">
      {children ?? (
        <p className="text-gray-500 text-sm">도구 패널</p>
      )}
    </aside>
  );
}
