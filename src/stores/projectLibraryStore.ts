/**
 * projectLibraryStore — 허브용 프로젝트 메타 목록.
 *
 * IndexedDB에서 메타 row만 읽어 카드 목록을 표시. 실제 sprite/frame은 프로젝트 진입 시 load.
 */

import { create } from "zustand";
import {
  getProjects,
  deleteProject as dbDeleteProject,
} from "@/services/persistence/db";
import type { ProjectSummary } from "@/services/persistence/types";

interface ProjectLibraryState {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

export const useProjectLibraryStore = create<ProjectLibraryState>((set) => ({
  projects: [],
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const list = await getProjects();
      set({ projects: list, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: (e as Error).message ?? "프로젝트 목록 불러오기 실패",
      });
    }
  },
  removeProject: async (id) => {
    await dbDeleteProject(id);
    const list = await getProjects();
    set({ projects: list });
  },
}));
