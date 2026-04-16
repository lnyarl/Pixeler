import { create } from "zustand";

const RESOLUTION_PRESETS = [16, 32, 64] as const;
const MIN_RESOLUTION = 8;
const MAX_RESOLUTION = 128;

export type ResolutionPreset = (typeof RESOLUTION_PRESETS)[number];
export type ToolType = "pen" | "eraser" | "mask";

export interface CanvasState {
  resolution: number;
  currentTool: ToolType;
  currentColor: string;
  brushSize: number;
  setResolution: (resolution: number) => void;
  setCurrentTool: (tool: ToolType) => void;
  setCurrentColor: (color: string) => void;
  setBrushSize: (size: number) => void;
}

export function isValidResolution(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_RESOLUTION &&
    value <= MAX_RESOLUTION
  );
}

export const useCanvasStore = create<CanvasState>((set) => ({
  resolution: 32,
  currentTool: "pen",
  currentColor: "#ffffff",
  brushSize: 1,
  setResolution: (resolution) => {
    if (isValidResolution(resolution)) {
      set({ resolution });
    }
  },
  setCurrentTool: (tool) => set({ currentTool: tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setBrushSize: (size) => {
    if (size >= 1 && size <= 8) {
      set({ brushSize: size });
    }
  },
}));

export { RESOLUTION_PRESETS, MIN_RESOLUTION, MAX_RESOLUTION };
