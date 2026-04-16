interface AIPanelProps {
  children?: React.ReactNode;
}

export default function AIPanel({ children }: AIPanelProps) {
  return (
    <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col p-3 gap-3 overflow-y-auto">
      {children ?? (
        <p className="text-gray-500 text-sm">AI 패널</p>
      )}
    </aside>
  );
}
