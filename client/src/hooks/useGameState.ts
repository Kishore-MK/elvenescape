import { useState, useCallback } from 'react';

interface GameState {
  health: number;
  ego: number;
  steps: number;
  inventory: {
    crystals: number;
    artifacts: number;
  };
}

interface GameActions {
  takeDamage: (amount: number) => void;
  addEgo: (amount: number) => void;
  addStep: () => void;
  addItem: (itemType: 'crystals' | 'artifacts', amount?: number) => void;
  resetGame: () => void;
}

const initialState: GameState = {
  health: 100,
  ego: 100,
  steps: 0,
  inventory: {
    crystals: 0,
    artifacts: 0
  }
};

export const useGameState = (): GameState & GameActions => {
  const [gameState, setGameState] = useState<GameState>(initialState);

  const takeDamage = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      health: Math.max(0, prev.health - amount)
    }));
  }, []);

  const addEgo = useCallback((amount: number) => {
    setGameState(prev => ({
      ...prev,
      ego: Math.min(200, prev.ego + amount) // Cap at 200
    }));
  }, []);

  const addStep = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      steps: prev.steps + 1
    }));
  }, []);

  const addItem = useCallback((itemType: 'crystals' | 'artifacts', amount: number = 1) => {
    setGameState(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [itemType]: prev.inventory[itemType] + amount
      }
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initialState);
  }, []);

  return {
    ...gameState,
    takeDamage,
    addEgo,
    addStep,
    addItem,
    resetGame
  };
};