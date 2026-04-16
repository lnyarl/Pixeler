import { useState, useCallback, useRef } from "react";

interface UseResizableOptions {
  defaultSize: number;
  minSize: number;
  maxSize: number;
  /** "left": 오른쪽 경계 드래그 (사이드바), "right": 왼쪽 경계 드래그 (AI 패널) */
  direction: "left" | "right";
}

export function useResizable({
  defaultSize,
  minSize,
  maxSize,
  direction,
}: UseResizableOptions) {
  const [size, setSize] = useState(defaultSize);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startSize = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startSize.current = size;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta =
          direction === "left"
            ? e.clientX - startX.current
            : startX.current - e.clientX;
        const newSize = Math.max(minSize, Math.min(maxSize, startSize.current + delta));
        setSize(newSize);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [size, minSize, maxSize, direction]
  );

  return { size, handleMouseDown };
}
