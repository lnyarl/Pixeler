import { downloadPng, hasContent } from "@/utils/exportPng";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";

export default function ExportButton() {
  const getImageData = useCanvasHandleStore((s) => s.getImageData);

  function handleExport() {
    const imageData = getImageData();
    if (!imageData) {
      alert("캔버스에 이미지가 없습니다.");
      return;
    }
    if (!hasContent(imageData)) {
      if (!window.confirm("캔버스가 비어있습니다. 빈 이미지를 내보내시겠습니까?")) {
        return;
      }
    }
    downloadPng(imageData);
  }

  return (
    <button
      onClick={handleExport}
      className="w-full px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
    >
      PNG 내보내기
    </button>
  );
}
