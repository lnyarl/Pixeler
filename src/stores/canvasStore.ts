import { create } from "zustand";

const RESOLUTION_PRESETS = [16, 32, 64] as const;
const MIN_RESOLUTION = 8;
const MAX_RESOLUTION = 128;

export type ResolutionPreset = (typeof RESOLUTION_PRESETS)[number];
export type ToolType = "pen" | "eraser" | "mask";

export interface CanvasState {
  width: number;
  height: number;
  linked: boolean;
  currentTool: ToolType;
  currentColor: string;
  brushSize: number;
  dirty: boolean;
  setResolution: (width: number, height: number) => void;
  setLinked: (linked: boolean) => void;
  setCurrentTool: (tool: ToolType) => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setDirty: (dirty: boolean) => void;
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
  dirty: false,
  setResolution: (width, height) => {
    if (isValidResolution(width) && isValidResolution(height)) {
      set({ width, height, dirty: false });
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
  setDirty: (dirty) => set({ dirty }),
}));

export { RESOLUTION_PRESETS, MIN_RESOLUTION, MAX_RESOLUTION };
