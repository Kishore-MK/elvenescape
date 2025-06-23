import React from 'react';
import { Inventory } from '../dojo/bindings';

interface GameUIProps {
  health: number;
  ego: number;
  steps: number;
  inventory: Inventory | null;
  kills: number;
  encounters: number;
}

const GameUI: React.FC<GameUIProps> = ({ health, ego, steps, inventory, kills, encounters }) => {
  const healthPercentage = Math.max(0, Math.min(100, health));
  const egoPercentage = Math.max(0, Math.min(100, ego / 2)); // Divide by 2 since max is 200

  const getHealthColor = (): string => {
    if (health > 50) return 'bg-green-500';
    if (health > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-5 pointer-events-none font-sans text-white">
      {/* Health and Ego Bars */}
      <div className="flex gap-5 mb-4">
        {/* Health Bar */}
        <div className="min-w-[200px]">
          <div className="text-sm mb-1 font-bold drop-shadow-lg">
            ❤️ Health: {health}/100
          </div>
          <div className="w-[200px] h-5 bg-white bg-opacity-20 border-2 border-white border-opacity-50 rounded-lg overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-in-out ${getHealthColor()}`}
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        {/* Ego Bar */}
        <div className="min-w-[200px]">
          <div className="text-sm mb-1 font-bold drop-shadow-lg">
            🌟 Ego: {ego}/200
          </div>
          <div className="w-[200px] h-5 bg-white bg-opacity-20 border-2 border-white border-opacity-50 rounded-lg overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 ease-in-out"
              style={{ width: `${egoPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 text-base font-bold flex-wrap">
        {/* Steps Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
          👣 Steps: {steps.toLocaleString()}
        </div>

        {/* Kills Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
          ⚔️ Kills: {kills}
        </div>

        {/* Encounters Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
          👁️ Encounters: {encounters}
        </div>

        {/* Inventory */}
        <div className="flex gap-4">
          <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
            💎 Crystals: {inventory?.blessings.length || 0}
          </div>
          <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
            🏺 Artifacts: {inventory?.cosmetics.length || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameUI;