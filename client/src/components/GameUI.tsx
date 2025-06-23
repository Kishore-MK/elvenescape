import React from 'react';
import useAppStore from '../zustand/store';

const GameUI: React.FC = () => {
  const { 
    player, 
    health, 
    stepCount, 
    inventory 
  } = useAppStore();

  // Extract values directly from store
  const currentHealth = Number(health?.current) || 0;
  const maxHealth = Number(health?.max) || 100;
  const ego = Number(player?.ego) || 0;
  const steps = Number(stepCount?.count) || 0;
  const kills = Number(player?.gatekeeper_kills) || 0;
  const encounters = Number(player?.encounters) || 0;
  const deaths = Number(player?.deaths) || 0;

  const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
  const egoPercentage = Math.max(0, Math.min(100, ego / 2)); // Divide by 2 since max is 200

  const getHealthColor = (): string => {
    if (currentHealth > maxHealth * 0.5) return 'bg-green-500';
    if (currentHealth > maxHealth * 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-5 pointer-events-none font-sans text-white">
      {/* Health and Ego Bars */}
      <div className="flex gap-5 mb-4">
        {/* Health Bar */}
        <div className="min-w-[200px]">
          <div className="text-sm mb-1 font-bold drop-shadow-lg">
            ❤️ Health: {currentHealth}/{maxHealth}
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

        {/* Deaths Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
          💀 Deaths: {deaths}
        </div>

        {/* Inventory */}
        <div className="flex gap-4">
          <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
            💎 Crystals: {inventory?.blessings?.length || 0}
          </div>
          <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg">
            🏺 Artifacts: {inventory?.cosmetics?.length || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameUI;