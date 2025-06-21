import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Position,
  StepCount,
  Player,
  Health,
  Inventory,
  OverloadState,
  CurrentEncounter,
  Shrine,
  Gatekeeper,
  StepTaken,
  EncounterFound,
  GatekeeperBattle,
  ShrineInteraction,
  PlayerDeath,
  OverloadTriggered,
  TrapTriggered,
  HealthDamage,
} from "../dojo/bindings";
import { BigNumberish } from "starknet";

// Game state enums
enum GamePhase {
  UNINITIALIZED = "uninitialized",
  INITIALIZING = "initializing",
  SPAWNING = "spawning",
  PLAYING = "playing",
  ENCOUNTER = "encounter",
  DEAD = "dead",
  OVERLOAD = "overload",
}

enum EncounterType {
  NONE = 0,
  GATEKEEPER = 1,
  SHRINE = 2,
  TRAP = 3,
}

// Define application state interface
interface AppState {
  // Core player data
  player: Player | null;
  position: Position | null;
  stepCount: StepCount | null;
  health: Health | null;
  inventory: Inventory | null;
  overloadState: OverloadState | null;
  currentEncounter: CurrentEncounter | null;

  // World entities (cached)
  shrines: Map<string, Shrine>;
  gatekeepers: Map<string, Gatekeeper>;

  // Game state management
  gamePhase: GamePhase;
  isPlayerInitialized: boolean;
  canTakeStep: boolean;

  // Event history (limited for performance)
  eventHistory: {
    stepsTaken: StepTaken[];
    encountersFound: EncounterFound[];
    gatekeeperBattles: GatekeeperBattle[];
    shrineInteractions: ShrineInteraction[];
    playerDeaths: PlayerDeath[];
    overloadTriggers: OverloadTriggered[];
    trapTriggers: TrapTriggered[];
    healthDamage: HealthDamage[];
  };

  // UI/UX state
  isLoading: boolean;
  error: string | null;
  lastAction: string | null;
  actionInProgress: boolean;

  // Statistics (derived from events)
  stats: {
    totalSteps: number;
    totalEncounters: number;
    gatekeepersDefeated: number;
    shrinesVisited: number;
    trapsTriggered: number;
    totalDeaths: number;
  };
}

// Define actions interface
interface AppActions {
  // Core player management
  initializePlayer: (player: Player) => void;
  updatePlayer: (updates: Partial<Player>) => void;
  setPosition: (position: Position | null) => void;
  setStepCount: (stepCount: StepCount | null) => void;
  setHealth: (health: Health | null) => void;
  updateHealth: (current: number, max?: number) => void;
  setInventory: (inventory: Inventory | null) => void;
  addToInventory: (cosmetics?: number[], blessings?: number[]) => void;
  setOverloadState: (overloadState: OverloadState | null) => void;
  setCurrentEncounter: (encounter: CurrentEncounter | null) => void;

  // World entity management
  setShrines: (shrines: Shrine[]) => void;
  addShrine: (shrine: Shrine) => void;
  updateShrine: (shrineId: string, updates: Partial<Shrine>) => void;
  getShrine: (shrineId: string) => Shrine | undefined;

  setGatekeepers: (gatekeepers: Gatekeeper[]) => void;
  addGatekeeper: (gatekeeper: Gatekeeper) => void;
  updateGatekeeper: (
    gatekeeperId: string,
    updates: Partial<Gatekeeper>
  ) => void;
  getGatekeeper: (gatekeeperId: string) => Gatekeeper | undefined;

  // Game state actions
  setGamePhase: (phase: GamePhase) => void;
  setCanTakeStep: (canStep: boolean) => void;
  setPlayerInitialized: (initialized: boolean) => void;

  // Event management with automatic stats update
  addStepTaken: (event: StepTaken) => void;
  addEncounterFound: (event: EncounterFound) => void;
  addGatekeeperBattle: (event: GatekeeperBattle) => void;
  addShrineInteraction: (event: ShrineInteraction) => void;
  addPlayerDeath: (event: PlayerDeath) => void;
  addOverloadTrigger: (event: OverloadTriggered) => void;
  addTrapTrigger: (event: TrapTriggered) => void;
  addHealthDamage: (event: HealthDamage) => void;
  clearEventHistory: () => void;

  // UI/UX actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastAction: (action: string | null) => void;
  setActionInProgress: (inProgress: boolean) => void;

  // Game lifecycle
  startNewGame: () => void;
  respawnPlayer: () => void;
  resetGame: () => void;
  resetStore: () => void;

  // Utility getters
  isInEncounter: () => boolean;
  getCurrentEncounterType: () => BigNumberish;
  canInteractWithShrine: (shrineId: string) => boolean;
  canAttackGatekeeper: (gatekeeperId: string) => boolean;
}

// Combine state and actions
type AppStore = AppState & AppActions;

// Helper function to update stats from events
const updateStats = (state: AppState): AppState["stats"] => {
  return {
    totalSteps: state.eventHistory.stepsTaken.length,
    totalEncounters: state.eventHistory.encountersFound.length,
    gatekeepersDefeated: state.eventHistory.gatekeeperBattles.filter(
      (b) => b.gatekeeper_defeated
    ).length,
    shrinesVisited: state.eventHistory.shrineInteractions.length,
    trapsTriggered: state.eventHistory.trapTriggers.length,
    totalDeaths: state.eventHistory.playerDeaths.length,
  };
};

// Initial state
const initialState: AppState = {
  // Core data
  player: null,
  position: null,
  stepCount: null,
  health: null,
  inventory: null,
  overloadState: null,
  currentEncounter: null,

  // World entities
  shrines: new Map(),
  gatekeepers: new Map(),

  // Game state
  gamePhase: GamePhase.UNINITIALIZED,
  isPlayerInitialized: false,
  canTakeStep: false,

  // Events
  eventHistory: {
    stepsTaken: [],
    encountersFound: [],
    gatekeeperBattles: [],
    shrineInteractions: [],
    playerDeaths: [],
    overloadTriggers: [],
    trapTriggers: [],
    healthDamage: [],
  },

  // UI state
  isLoading: false,
  error: null,
  lastAction: null,
  actionInProgress: false,

  // Stats
  stats: {
    totalSteps: 0,
    totalEncounters: 0,
    gatekeepersDefeated: 0,
    shrinesVisited: 0,
    trapsTriggered: 0,
    totalDeaths: 0,
  },
};

// Maximum events to keep in history (for performance)
const MAX_EVENTS = 50;

// Create the store
const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Core player management
      initializePlayer: (player) =>
        set({
          player,
          isPlayerInitialized: true,
          gamePhase: GamePhase.SPAWNING,
        }),

      updatePlayer: (updates) =>
        set((state) => ({
          player: state.player ? { ...state.player, ...updates } : null,
        })),

      setPosition: (position) => set({ position }),
      setStepCount: (stepCount) => set({ stepCount }),
      setHealth: (health) => set({ health }),

      updateHealth: (current, max) =>
        set((state) => ({
          health: state.health
            ? {
                ...state.health,
                current,
                max: max ?? state.health.max,
              }
            : null,
        })),

      setInventory: (inventory) => set({ inventory }),

      addToInventory: (cosmetics = [], blessings = []) =>
        set((state) => ({
          inventory: state.inventory
            ? {
                ...state.inventory,
                cosmetics: [...state.inventory.cosmetics, ...cosmetics],
                blessings: [...state.inventory.blessings, ...blessings],
              }
            : null,
        })),

      setOverloadState: (overloadState) =>
        set({
          overloadState,
          gamePhase: overloadState?.is_active
            ? GamePhase.OVERLOAD
            : GamePhase.PLAYING,
        }),

      setCurrentEncounter: (encounter) =>
        set({
          currentEncounter: encounter,
          gamePhase: encounter ? GamePhase.ENCOUNTER : GamePhase.PLAYING,
        }),

      // World entity management
      setShrines: (shrines) =>
        set({
          shrines: new Map(shrines.map((s) => [s.shrine_id.toString(), s])),
        }),

      addShrine: (shrine) =>
        set((state) => {
          const newShrines = new Map(state.shrines);
          newShrines.set(shrine.shrine_id.toString(), shrine);
          return { shrines: newShrines };
        }),

      updateShrine: (shrineId, updates) =>
        set((state) => {
          const newShrines = new Map(state.shrines);
          const existing = newShrines.get(shrineId);
          if (existing) {
            newShrines.set(shrineId, { ...existing, ...updates });
          }
          return { shrines: newShrines };
        }),

      getShrine: (shrineId) => get().shrines.get(shrineId),

      setGatekeepers: (gatekeepers) =>
        set({
          gatekeepers: new Map(
            gatekeepers.map((g) => [g.gatekeeper_id.toString(), g])
          ),
        }),

      addGatekeeper: (gatekeeper) =>
        set((state) => {
          const newGatekeepers = new Map(state.gatekeepers);
          newGatekeepers.set(gatekeeper.gatekeeper_id.toString(), gatekeeper);
          return { gatekeepers: newGatekeepers };
        }),

      updateGatekeeper: (gatekeeperId, updates) =>
        set((state) => {
          const newGatekeepers = new Map(state.gatekeepers);
          const existing = newGatekeepers.get(gatekeeperId);
          if (existing) {
            newGatekeepers.set(gatekeeperId, { ...existing, ...updates });
          }
          return { gatekeepers: newGatekeepers };
        }),

      getGatekeeper: (gatekeeperId) => get().gatekeepers.get(gatekeeperId),

      // Game state actions
      setGamePhase: (gamePhase) => set({ gamePhase }),
      setCanTakeStep: (canTakeStep) => set({ canTakeStep }),
      setPlayerInitialized: (isPlayerInitialized) =>
        set({ isPlayerInitialized }),

      // Event management with auto-stats update
      addStepTaken: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            stepsTaken: [
              ...state.eventHistory.stepsTaken.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
            canTakeStep: true,
          };
        }),

      addEncounterFound: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            encountersFound: [
              ...state.eventHistory.encountersFound.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
          };
        }),

      addGatekeeperBattle: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            gatekeeperBattles: [
              ...state.eventHistory.gatekeeperBattles.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
          };
        }),

      addShrineInteraction: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            shrineInteractions: [
              ...state.eventHistory.shrineInteractions.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
          };
        }),

      addPlayerDeath: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            playerDeaths: [
              ...state.eventHistory.playerDeaths.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
            gamePhase: GamePhase.DEAD,
            currentEncounter: null,
          };
        }),

      addOverloadTrigger: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            overloadTriggers: [
              ...state.eventHistory.overloadTriggers.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
          };
        }),

      addTrapTrigger: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            trapTriggers: [
              ...state.eventHistory.trapTriggers.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
          };
        }),

      addHealthDamage: (event) =>
        set((state) => {
          const newEvents = {
            ...state.eventHistory,
            healthDamage: [
              ...state.eventHistory.healthDamage.slice(-MAX_EVENTS + 1),
              event,
            ],
          };
          return {
            eventHistory: newEvents,
            stats: updateStats({ ...state, eventHistory: newEvents }),
          };
        }),

      clearEventHistory: () =>
        set((state) => ({
          eventHistory: {
            stepsTaken: [],
            encountersFound: [],
            gatekeeperBattles: [],
            shrineInteractions: [],
            playerDeaths: [],
            overloadTriggers: [],
            trapTriggers: [],
            healthDamage: [],
          },
          stats: updateStats({
            ...state,
            eventHistory: initialState.eventHistory,
          }),
        })),

      // UI actions
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setLastAction: (lastAction) => set({ lastAction }),
      setActionInProgress: (actionInProgress) => set({ actionInProgress }),

      // Game lifecycle
      startNewGame: () =>
        set({
          gamePhase: GamePhase.INITIALIZING,
          currentEncounter: null,
          canTakeStep: false,
          error: null,
        }),

      respawnPlayer: () =>
        set({
          gamePhase: GamePhase.SPAWNING,
          currentEncounter: null,
          canTakeStep: false,
          error: null,
        }),

      resetGame: () =>
        set({
          gamePhase: GamePhase.UNINITIALIZED,
          isPlayerInitialized: false,
          currentEncounter: null,
          canTakeStep: false,
          shrines: new Map(),
          gatekeepers: new Map(),
          error: null,
        }),

      resetStore: () => set(initialState),

      // Utility getters
      isInEncounter: () => {
        const state = get();
        return state.currentEncounter !== null;
      },

      getCurrentEncounterType: () => {
        const state = get();
        return state.currentEncounter?.encounter_type || EncounterType.NONE;
      },

      canInteractWithShrine: (shrineId) => {
        const state = get();
        const shrine = state.shrines.get(shrineId);
        return (
          shrine?.is_active === true && state.gamePhase === GamePhase.ENCOUNTER
        );
      },

      canAttackGatekeeper: (gatekeeperId) => {
        const state = get();
        const gatekeeper = state.gatekeepers.get(gatekeeperId);
        return (
          (gatekeeper &&
            Number(gatekeeper.health) > 0 &&
            state.gamePhase === GamePhase.ENCOUNTER) ||
          false
        );
      },
    }),
    {
      name: "kaadugame-store",
      partialize: (state) => ({
        // Persist core player data
        player: state.player,
        position: state.position,
        stepCount: state.stepCount,
        health: state.health,
        inventory: state.inventory,
        overloadState: state.overloadState,

        // Persist game state
        gamePhase: state.gamePhase,
        isPlayerInitialized: state.isPlayerInitialized,

        // Persist recent stats but not full event history
        stats: state.stats,

        // Don't persist: entities (should be fetched), events (too large), UI state
      }),
    }
  )
);

export default useAppStore;
export { GamePhase, EncounterType };
export type { AppState, AppActions, AppStore };