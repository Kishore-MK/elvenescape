import React from "react";
import useAppStore from "../zustand/store";

const GameUI: React.FC = () => {
  const { player, health, stepCount, inventory } = useAppStore();

  // Extract values directly from store
  const currentHealth = Number(health?.current) || 0;
  const maxHealth = Number(health?.max) || 100;
  const ego = Number(player?.ego) || 0;
  const steps = Number(stepCount?.count) || 0;
  const kills = Number(player?.gatekeeper_kills) || 0;
  const encounters = Number(player?.encounters) || 0;
  const deaths = Number(player?.deaths) || 0;

  const healthPercentage = Math.max(
    0,
    Math.min(100, (currentHealth / maxHealth) * 100)
  );
  const egoPercentage = Math.max(0, Math.min(100, ego / 2)); // Divide by 2 since max is 200

  const getHealthColor = (): string => {
    if (currentHealth > maxHealth * 0.5) return "bg-green-500";
    if (currentHealth > maxHealth * 0.25) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-2 sm:p-5 pointer-events-none font-sans text-white">
      {/* Health and Ego Bars */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 mb-3 sm:mb-4">
        {/* Health Bar */}
        <div className="flex-1 min-w-0">
          <div className="text-sm sm:text-base mb-1 font-bold drop-shadow-lg">
            ❤️ Health: {currentHealth}/{maxHealth}
          </div>
          <div className="w-full h-5 sm:h-6 bg-white bg-opacity-20 border-2 border-white border-opacity-50 rounded-lg overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-in-out ${getHealthColor()}`}
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        {/* Ego Bar */}
        <div className="flex-1 min-w-0">
          <div className="text-sm sm:text-base mb-1 font-bold drop-shadow-lg">
            🌟 Ego: {ego}/200
          </div>
          <div className="w-full h-5 sm:h-6 bg-white bg-opacity-20 border-2 border-white border-opacity-50 rounded-lg overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 ease-in-out"
              style={{ width: `${egoPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Stats - Only Health and Kills */}
      <div className="grid grid-cols-2 gap-2 mb-3 sm:hidden">
        {/* Health Stat (Mobile) */}
        <div className="bg-black bg-opacity-70 px-3 py-2 rounded-lg border border-white border-opacity-40 drop-shadow-lg">
          <div className="text-xs text-gray-300 mb-1">Steps</div>
          <div className="text-lg font-bold">👣 {steps.toLocaleString()}</div>
        </div>

        {/* Kills Counter (Mobile) */}
        <div className="bg-black bg-opacity-70 px-3 py-2 rounded-lg border border-white border-opacity-40 drop-shadow-lg">
          <div className="text-xs text-gray-300 mb-1">Kills</div>
          <div className="text-lg font-bold text-red-400">⚔️ {kills}</div>
        </div>
      </div>

      {/* Desktop Stats - All stats in one row */}
      <div className="hidden sm:grid sm:grid-cols-6 gap-2 text-base font-bold">
        {/* Steps Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg text-center">
          <div>👣 Steps:</div>
          <div>{steps.toLocaleString()}</div>
        </div>

        {/* Kills Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg text-center">
          <div>⚔️ Kills:</div>
          <div className="text-red-400">{kills}</div>
        </div>

        {/* Encounters Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg text-center">
          <div>👁️ Encounters:</div>
          <div>{encounters}</div>
        </div>

        {/* Deaths Counter */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg text-center">
          <div>💀 Deaths:</div>
          <div>{deaths}</div>
        </div>

        {/* Blessings */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg text-center">
          <div>💎 Blessings:</div>
          <div>{inventory?.blessings?.length || 0}</div>
        </div>

        {/* Cosmetics */}
        <div className="bg-black bg-opacity-60 px-3 py-2 rounded-lg border border-white border-opacity-30 drop-shadow-lg text-center">
          <div>🏺 Cosmetics:</div>
          <div>{inventory?.cosmetics?.length || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default GameUI;
