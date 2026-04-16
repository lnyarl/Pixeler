interface MainAreaProps {
  children?: React.ReactNode;
}

export default function MainArea({ children }: MainAreaProps) {
  return (
    <main className="flex-1 bg-gray-900 flex overflow-hidden">
      {children ?? (
        <p className="text-gray-500">캔버스 영역</p>
      )}
    </main>
  );
}
