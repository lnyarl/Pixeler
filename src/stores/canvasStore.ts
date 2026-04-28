import { create } from "zustand";

const RESOLUTION_PRESETS = [16, 32, 64] as const;
const MIN_RESOLUTION = 8;
const MAX_RESOLUTION = 128;

export type ResolutionPreset = (typeof RESOLUTION_PRESETS)[number];
export type ToolType = "pen" | "eraser" | "move" | "mask";

/**
 * 캔버스 declarative state.
 *
 * **PR-α 변경 (C1)**: `dirty`/`setDirty` 제거. dirty 개념은 `projectStore.dirty`로 일원화.
 * 그리기 시 `projectStore.markDirty()` 호출, `useBeforeUnload`도 projectStore.dirty 검사.
 */
export interface CanvasState {
  width: number;
  height: number;
  linked: boolean;
  currentTool: ToolType;
  currentColor: string;
  brushSize: number;
  maskData: ImageData | null;
  setResolution: (width: number, height: number) => void;
  setLinked: (linked: boolean) => void;
  setCurrentTool: (tool: ToolType) => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setMaskData: (mask: ImageData | null) => void;
  clearMask: () => void;
}

export function isValidResolution(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_RESOLUTION &&
    value <= MAX_RESOLUTION
  );
}

export const useCanvasStore = create<CanvasState>((set) => ({
  width: 32,
  height: 32,
  linked: true,
  currentTool: "pen",
  currentColor: "#ffffff",
  brushSize: 1,
  maskData: null,
  setResolution: (width, height) => {
    if (isValidResolution(width) && isValidResolution(height)) {
      set({ width, height });
    }
  },
  setLinked: (linked) => set({ linked }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setBrushSize: (size) => {
    if (size >= 1 && size <= 8) {
      set({ brushSize: size });
    }
  },
  setMaskData: (mask) => set({ maskData: mask }),
  clearMask: () => set({ maskData: null }),
}));

export { RESOLUTION_PRESETS, MIN_RESOLUTION, MAX_RESOLUTION };
