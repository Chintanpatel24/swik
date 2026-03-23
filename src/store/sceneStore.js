import { create } from 'zustand';

export const useSceneStore = create((set) => ({
  // Map of agentId → { x, y } screen-space pixel position
  screenPositions: {},
  setScreenPosition: (agentId, pos) =>
    set((s) => ({ screenPositions: { ...s.screenPositions, [agentId]: pos } })),
  clearScreenPositions: () => set({ screenPositions: {} }),

  // Hovered agent
  hoveredAgentId: null,
  setHoveredAgentId: (id) => set({ hoveredAgentId: id }),

  // Scene loaded flag
  sceneLoaded: false,
  setSceneLoaded: (v) => set({ sceneLoaded: v }),
}));
