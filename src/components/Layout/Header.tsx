interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <h1 className="text-lg font-bold text-white">Pixeler</h1>
      <button
        onClick={onSettingsClick}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="설정"
      >
        ⚙
      </button>
    </header>
  );
}
