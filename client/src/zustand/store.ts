import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Position,
  StepCount,
  Player,
  Health,
  Inventory,
  OverloadState,
  Shrine,
  Gatekeeper,
  StepTaken,
  GatekeeperBattle,
  ShrineInteraction,
  PlayerDeath,
  OverloadTriggered,
  TrapTriggered,
  HealthDamage,
} from "../dojo/bindings"; 

// Game state enums
enum GamePhase {
  UNINITIALIZED = "uninitialized",
  INITIALIZING = "initializing", 
  SPAWNED = "spawned",
  WALKING = "walking",
  AT_SHRINE = "at_shrine",
  FIGHTING_GATEKEEPER = "fighting_gatekeeper",
  OVERLOADED = "overloaded",
  DEAD = "dead",
}

// Define application state interface
interface AppState {
  // Core player data (from blockchain)
  player: Player | null;
  position: Position | null; 
  stepCount: StepCount | null;
  health: Health | null;
  inventory: Inventory | null;
  overloadState: OverloadState | null;

  // World entities (cached from blockchain queries)
  shrines: Map<string, Shrine>;
  gatekeepers: Map<string, Gatekeeper>;

  // Derived game state
  gamePhase: GamePhase;
  isPlayerInitialized: boolean;

  // Recent event history (for UI feedback and animations)
  recentEvents: {
    stepsTaken: StepTaken[];
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
  lastTransaction: string | null;
  actionInProgress: boolean;
  connectionStatus: "connected" | "connecting" | "disconnected";

  // Game statistics (derived from player data)
  gameStats: {
    currentSteps: number;
    totalEncounters: number;
    gatekeeperKills: number;
    totalDeaths: number;
    trapsTriggered: number;
    cosmeticsUnlocked: number;
    currentEgo: number;
    isGreedMarked: boolean;
  };
}

// Define actions interface
interface AppActions {
  // Core state setters (from blockchain data)
  setPlayer: (player: Player | null) => void;
  setPosition: (position: Position | null) => void;
  setStepCount: (stepCount: StepCount | null) => void;
  setHealth: (health: Health | null) => void;
  setInventory: (inventory: Inventory | null) => void;
  setOverloadState: (overloadState: OverloadState | null) => void;

  // World entity management
  setShrines: (shrines: Shrine[]) => void;
  updateShrine: (shrine: Shrine) => void;
  setGatekeepers: (gatekeepers: Gatekeeper[]) => void;
  updateGatekeeper: (gatekeeper: Gatekeeper) => void;

  // Game state management
  setGamePhase: (phase: GamePhase) => void;
  setPlayerInitialized: (initialized: boolean) => void;

  // Event handling (for UI feedback)
  addStepTaken: (event: StepTaken) => void;
  addGatekeeperBattle: (event: GatekeeperBattle) => void;
  addShrineInteraction: (event: ShrineInteraction) => void;
  addPlayerDeath: (event: PlayerDeath) => void;
  addOverloadTrigger: (event: OverloadTriggered) => void;
  addTrapTrigger: (event: TrapTriggered) => void;
  addHealthDamage: (event: HealthDamage) => void;
  clearRecentEvents: () => void;

  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastTransaction: (txHash: string | null) => void;
  setActionInProgress: (inProgress: boolean) => void;
  setConnectionStatus: (status: "connected" | "connecting" | "disconnected") => void;

  // Game lifecycle
  initializeGame: () => void;
  respawnPlayer: () => void;
  resetGame: () => void;

  // Utility getters
  canTakeStep: () => boolean;
  canInteractWithShrine: () => boolean;
  canAttackGatekeeper: () => boolean;
  getShrineAtPosition: (position: number) => Shrine | null;
  getGatekeeperAtPosition: (position: number) => Gatekeeper | null;
  isOverloaded: () => boolean;
  getPlayerEgo: () => number;
}

// Combine state and actions
type AppStore = AppState & AppActions;

// Helper to update game stats from player data
const updateGameStats = (player: Player | null): AppState["gameStats"] => {
  if (!player) {
    return {
      currentSteps: 0,
      totalEncounters: 0,
      gatekeeperKills: 0,
      totalDeaths: 0,
      trapsTriggered: 0,
      cosmeticsUnlocked: 0,
      currentEgo: 0,
      isGreedMarked: false,
    };
  }

  return {
    currentSteps: Number(player.steps),
    totalEncounters: Number(player.encounters),
    gatekeeperKills: Number(player.gatekeeper_kills),
    totalDeaths: Number(player.deaths),
    trapsTriggered: Number(player.traps_triggered),
    cosmeticsUnlocked: Number(player.cosmetics_unlocked),
    currentEgo: Number(player.ego),
    isGreedMarked: player.greed_marked,
  };
};

// Helper to determine game phase based on state
const determineGamePhase = (
  player: Player | null,
  health: Health | null,
  overloadState: OverloadState | null
): GamePhase => {
  if (!player) return GamePhase.UNINITIALIZED;
  
  if (health && Number(health.current) <= 0) return GamePhase.DEAD;
  
  if (overloadState?.is_active) return GamePhase.OVERLOADED;
  
  return GamePhase.WALKING;
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

  // World entities
  shrines: new Map(),
  gatekeepers: new Map(),

  // Game state
  gamePhase: GamePhase.UNINITIALIZED,
  isPlayerInitialized: false,

  // Events (limited recent history for UI feedback)
  recentEvents: {
    stepsTaken: [],
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
  lastTransaction: null,
  actionInProgress: false,
  connectionStatus: "disconnected",

  // Stats
  gameStats: {
    currentSteps: 0,
    totalEncounters: 0,
    gatekeeperKills: 0,
    totalDeaths: 0,
    trapsTriggered: 0,
    cosmeticsUnlocked: 0,
    currentEgo: 0,
    isGreedMarked: false,
  },
};

// Maximum recent events to keep (for performance)
const MAX_RECENT_EVENTS = 20;

// Create the store
const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Core state setters
      setPlayer: (player) =>
        set((state) => {
          const gameStats = updateGameStats(player);
          const gamePhase = determineGamePhase(
            player,
            state.health,
            state.overloadState
          );

          return {
            player,
            gameStats,
            gamePhase,
            isPlayerInitialized: player !== null,
          };
        }),

      setPosition: (position) =>
        set((state) => {
          const gamePhase = determineGamePhase(
            state.player,
            state.health,
            state.overloadState
          );

          return { position, gamePhase };
        }),

      setStepCount: (stepCount) => set({ stepCount }),

      setHealth: (health) =>
        set((state) => {
          const gamePhase = determineGamePhase(
            state.player,
            health,
            state.overloadState
          );
          return { health, gamePhase };
        }),

      setInventory: (inventory) => set({ inventory }),

      setOverloadState: (overloadState) =>
        set((state) => {
          const gamePhase = determineGamePhase(
            state.player,
            state.health,
            overloadState
          );
          return { overloadState, gamePhase };
        }),

      // World entity management
      setShrines: (shrines) =>
        set((state) => {
          const shrineMap = new Map(
            shrines.map((s) => [s.shrine_id.toString(), s])
          );
          const gamePhase = determineGamePhase(
            state.player,
            state.health,
            state.overloadState
          );

          return { shrines: shrineMap, gamePhase };
        }),

      updateShrine: (shrine) =>
        set((state) => {
          const newShrines = new Map(state.shrines);
          newShrines.set(shrine.shrine_id.toString(), shrine);
          
          const gamePhase = determineGamePhase(
            state.player,
            state.health,
            state.overloadState
          );

          return { shrines: newShrines, gamePhase };
        }),

      setGatekeepers: (gatekeepers) =>
        set((state) => {
          const gatekeeperMap = new Map(
            gatekeepers.map((g) => [g.gatekeeper_id.toString(), g])
          );
          const gamePhase = determineGamePhase(
            state.player,
            state.health,
            state.overloadState
          );

          return { gatekeepers: gatekeeperMap, gamePhase };
        }),

      updateGatekeeper: (gatekeeper) =>
        set((state) => {
          const newGatekeepers = new Map(state.gatekeepers);
          newGatekeepers.set(gatekeeper.gatekeeper_id.toString(), gatekeeper);
          console.log("Printing state for updateGatekeeper",newGatekeepers);
          const gamePhase = determineGamePhase(
            state.player,
            state.health,
            state.overloadState
          );

          return { gatekeepers: newGatekeepers, gamePhase };
        }),

      // Game state management
      setGamePhase: (gamePhase) => set({ gamePhase }),
      setPlayerInitialized: (isPlayerInitialized) => set({ isPlayerInitialized }),

      // Event handling (keep recent events for UI feedback)
      addStepTaken: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            stepsTaken: [
              ...state.recentEvents.stepsTaken.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
        })),

      addGatekeeperBattle: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            gatekeeperBattles: [
              ...state.recentEvents.gatekeeperBattles.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
        })),

      addShrineInteraction: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            shrineInteractions: [
              ...state.recentEvents.shrineInteractions.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
        })),

      addPlayerDeath: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            playerDeaths: [
              ...state.recentEvents.playerDeaths.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
          gamePhase: GamePhase.DEAD,
        })),

      addOverloadTrigger: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            overloadTriggers: [
              ...state.recentEvents.overloadTriggers.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
        })),

      addTrapTrigger: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            trapTriggers: [
              ...state.recentEvents.trapTriggers.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
        })),

      addHealthDamage: (event) =>
        set((state) => ({
          recentEvents: {
            ...state.recentEvents,
            healthDamage: [
              ...state.recentEvents.healthDamage.slice(-MAX_RECENT_EVENTS + 1),
              event,
            ],
          },
        })),

      clearRecentEvents: () =>
        set({
          recentEvents: {
            stepsTaken: [],
            gatekeeperBattles: [],
            shrineInteractions: [],
            playerDeaths: [],
            overloadTriggers: [],
            trapTriggers: [],
            healthDamage: [],
          },
        }),

      // UI actions
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setLastTransaction: (lastTransaction) => set({ lastTransaction }),
      setActionInProgress: (actionInProgress) => set({ actionInProgress }),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

      // Game lifecycle
      initializeGame: () =>
        set({
          gamePhase: GamePhase.INITIALIZING,
          error: null,
          isLoading: true,
        }),

      respawnPlayer: () =>
        set({
          gamePhase: GamePhase.SPAWNED,
          error: null,
        }),

      resetGame: () =>
        set({
          ...initialState,
          connectionStatus: get().connectionStatus, // Keep connection status
        }),

      // Utility getters
      canTakeStep: () => {
        const state = get();
        return (
          state.gamePhase === GamePhase.WALKING &&
          !state.actionInProgress &&
          state.health !== null &&
          Number(state.health.current) > 0 &&
          !state.overloadState?.is_active
        );
      },

      canInteractWithShrine: () => {
        const state = get();
        return (
          !state.actionInProgress &&
          state.health !== null &&
          Number(state.health.current) > 0
        );
      },

      canAttackGatekeeper: () => {
        const state = get();
        return (
          !state.actionInProgress &&
          state.health !== null &&
          Number(state.health.current) > 0
        );
      },

      getShrineAtPosition: (position: number) => {
        const state = get();
        for (const [id, shrine] of state.shrines) {
          if (Number(shrine.position) === position && shrine.is_active) {
            return shrine;
          }
        }
        return null;
      },

      getGatekeeperAtPosition: (position: number) => {
        const state = get();
        console.log("Printing state for getGatekeeperAtPosition",state.gatekeepers);
        
        for (const [id, gatekeeper] of state.gatekeepers) {
          if (Number(gatekeeper.position) === position && Number(gatekeeper.health) > 0) {
            return gatekeeper;
          }
        }
        return null;
      },

      isOverloaded: () => {
        const state = get();
        return state.overloadState?.is_active === true;
      },

      getPlayerEgo: () => {
        const state = get();
        return state.player ? Number(state.player.ego) : 0;
      },
    }),
    {
      name: "kaadugame-store",
      partialize: (state) => ({
        // Persist only essential data
        player: state.player,
        position: state.position,
        stepCount: state.stepCount,
        health: state.health,
        inventory: state.inventory,
        overloadState: state.overloadState,
        isPlayerInitialized: state.isPlayerInitialized,
        gameStats: state.gameStats,
        // Don't persist: entities (refetch from blockchain), events (UI only), UI state
      }),
    }
  )
);

export default useAppStore;
export { GamePhase };
export type { AppState, AppActions, AppStore };