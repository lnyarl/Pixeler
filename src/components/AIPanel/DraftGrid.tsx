import { useGenerationStore } from "@/stores/generationStore";
import type { GeneratedImage } from "@/services/ai/types";

interface DraftGridProps {
  onSelect: (imageData: ImageData) => void;
}

export default function DraftGrid({ onSelect }: DraftGridProps) {
  const drafts = useGenerationStore((s) => s.drafts);

  if (drafts.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">
        초안 선택 ({drafts.length}장)
      </label>
      <div className="grid grid-cols-2 gap-1">
        {drafts.map((draft, i) => (
          <DraftThumbnail
            key={i}
            draft={draft}
            index={i}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function DraftThumbnail({
  draft,
  index,
  onSelect,
}: {
  draft: GeneratedImage;
  index: number;
  onSelect: (imageData: ImageData) => void;
}) {
  function handleClick() {
    if (draft._processedImageData) {
      onSelect(draft._processedImageData);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="aspect-square bg-gray-700 rounded border border-gray-600 hover:border-blue-500 overflow-hidden transition-colors"
      title={`초안 ${index + 1}`}
    >
      <img
        src={`data:image/png;base64,${draft.base64}`}
        alt={`초안 ${index + 1}`}
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </button>
  );
}
