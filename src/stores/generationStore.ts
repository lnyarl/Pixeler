import { create } from "zustand";
import type { GeneratedImage } from "@/services/ai/types";

export interface GenerationState {
  status: "idle" | "loading" | "error" | "done";
  errorMessage: string;
  drafts: GeneratedImage[];
  prompt: string;
  count: number;
  abortController: AbortController | null;
  setPrompt: (prompt: string) => void;
  setCount: (count: number) => void;
  startGeneration: () => AbortController;
  setDrafts: (drafts: GeneratedImage[]) => void;
  setError: (message: string) => void;
  cancel: () => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  status: "idle",
  errorMessage: "",
  drafts: [],
  prompt: "",
  count: 1,
  abortController: null,

  setPrompt: (prompt) => set({ prompt }),
  setCount: (count) => {
    if (count >= 1 && count <= 4) set({ count });
  },

  startGeneration: () => {
    const controller = new AbortController();
    set({
      status: "loading",
      errorMessage: "",
      drafts: [],
      abortController: controller,
    });
    return controller;
  },

  setDrafts: (drafts) =>
    set({ status: "done", drafts, abortController: null }),

  setError: (message) =>
    set({ status: "error", errorMessage: message, abortController: null }),

  cancel: () => {
    const controller = get().abortController;
    if (controller) controller.abort();
    set({ status: "idle", abortController: null });
  },

  reset: () =>
    set({
      status: "idle",
      errorMessage: "",
      drafts: [],
      abortController: null,
    }),
}));
