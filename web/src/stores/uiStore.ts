import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { pruneDirectoryPaths, setDirectoryPathOpen } from '../lib/openDirectories';

const MAX_RECENT_FILES = 5;

interface ScopedUiState {
  openDirectories: string[];
  recentFiles: string[];
}

interface UiStore {
  activeScope?: string;
  showSearch: boolean;
  openDirectories: string[];
  sidebarCollapsed: boolean;
  recentFiles: string[];
  scoped: Record<string, ScopedUiState>;
  setScope: (scope: string | undefined) => void;
  setShowSearch: (v: boolean) => void;
  setDirectoryOpen: (path: string, open: boolean) => void;
  pruneOpenDirectories: (validPaths: string[]) => void;
  toggleSidebar: () => void;
  addRecentFile: (path: string) => void;
}

interface PersistedUiState {
  sidebarCollapsed: boolean;
  scoped: Record<string, ScopedUiState>;
}

function emptyScopedState(): ScopedUiState {
  return { openDirectories: [], recentFiles: [] };
}

function mergeScopedState(base: ScopedUiState, incoming: ScopedUiState): ScopedUiState {
  return {
    openDirectories: incoming.openDirectories.length > 0 ? incoming.openDirectories : base.openDirectories,
    recentFiles: incoming.recentFiles.length > 0 ? incoming.recentFiles : base.recentFiles,
  };
}

export const useUiStore = create<UiStore>()(
  persist<UiStore, [], [], PersistedUiState>(
    (set) => ({
      activeScope: undefined,
      showSearch: false,
      openDirectories: [],
      sidebarCollapsed: false,
      recentFiles: [],
      scoped: {},
      setScope: (scope) => set((state) => {
        if (!scope) {
          if (!state.activeScope) return state;
          return { activeScope: undefined, openDirectories: [], recentFiles: [] };
        }

        const persistedScope = state.scoped[scope] ?? emptyScopedState();
        const nextScope = !state.activeScope
          ? mergeScopedState(persistedScope, {
              openDirectories: state.openDirectories,
              recentFiles: state.recentFiles,
            })
          : persistedScope;

        return {
          activeScope: scope,
          openDirectories: nextScope.openDirectories,
          recentFiles: nextScope.recentFiles,
          scoped: state.scoped[scope] === nextScope ? state.scoped : { ...state.scoped, [scope]: nextScope },
        };
      }),
      setShowSearch: (showSearch) => set({ showSearch }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setDirectoryOpen: (path, open) => set((state) => {
        const openDirectories = setDirectoryPathOpen(state.openDirectories, path, open);
        if (openDirectories === state.openDirectories) return state;
        return state.activeScope
          ? {
              openDirectories,
              scoped: {
                ...state.scoped,
                [state.activeScope]: {
                  openDirectories,
                  recentFiles: state.recentFiles,
                },
              },
            }
          : { openDirectories };
      }),
      pruneOpenDirectories: (validPaths) => set((state) => {
        const openDirectories = pruneDirectoryPaths(state.openDirectories, validPaths);
        if (openDirectories === state.openDirectories) return state;
        return state.activeScope
          ? {
              openDirectories,
              scoped: {
                ...state.scoped,
                [state.activeScope]: {
                  openDirectories,
                  recentFiles: state.recentFiles,
                },
              },
            }
          : { openDirectories };
      }),
      addRecentFile: (path) => set((state) => {
        const filtered = state.recentFiles.filter((f) => f !== path);
        const recentFiles = [path, ...filtered].slice(0, MAX_RECENT_FILES);
        return state.activeScope
          ? {
              recentFiles,
              scoped: {
                ...state.scoped,
                [state.activeScope]: {
                  openDirectories: state.openDirectories,
                  recentFiles,
                },
              },
            }
          : { recentFiles };
      }),
    }),
    {
      name: 'seams-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, scoped: state.scoped }),
    },
  ),
);
