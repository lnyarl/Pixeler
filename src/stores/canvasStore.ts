import { create } from "zustand";

const RESOLUTION_PRESETS = [16, 32, 64] as const;
const MIN_RESOLUTION = 8;
const MAX_RESOLUTION = 128;

export type ResolutionPreset = (typeof RESOLUTION_PRESETS)[number];

export interface CanvasState {
  resolution: number;
  setResolution: (resolution: number) => void;
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
  setResolution: (resolution) => {
    if (isValidResolution(resolution)) {
      set({ resolution });
    }
  },
}));

export { RESOLUTION_PRESETS, MIN_RESOLUTION, MAX_RESOLUTION };
