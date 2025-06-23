import React, { useState } from "react";
import Shrine from "./Shrine";
import Enemy from "./Enemy";
import { useMovement } from "../hooks/useMovement";

interface EntitiesProps {
  shrineCount?: number;
  enemyCount?: number;
  spawnAreaStart?: number;
  spawnAreaEnd?: number;
  showShrine?: boolean;
  showEnemy?: boolean;
  shrineScale?: number;
  enemyScale?: [number, number, number];
  triggerDistance?: number;
  onDamage?: (amount: number) => void;
  onKillReward?: () => void;
  onActivateShrine?: () => void; // Add this line
  damagePerSecond?: number;
}


const Entities: React.FC<EntitiesProps> = ({
  shrineCount = 2,
  enemyCount = 3,
  spawnAreaStart = 20,
  spawnAreaEnd = 100,
  showShrine = true,
  showEnemy = true,
  shrineScale = 5,
  enemyScale = [2.5, 2.5, 2.5],
  triggerDistance = 5,
  onDamage,
  onKillReward,
  onActivateShrine,
  damagePerSecond = 10,
}) => {
  const { position } = useMovement(5);
  
  const [entities] = useState(() => ({
    shrines: Array.from({ length: shrineCount }, (_, i) => {
      const xPos = Math.random() > 0.5 ? 2 : -2;
      return {
        id: i,
        position: [
          xPos,
          2,
          spawnAreaStart +
            i * ((spawnAreaEnd - spawnAreaStart) / shrineCount) +
            Math.random() * 10,
        ] as [number, number, number],
        rotation: xPos === 2 ? 4 : -4,
      };
    }),
    enemies: Array.from({ length: enemyCount }, (_, i) => ({
      id: i,
      position: [
        Math.random() > 0.5 ? 2 : -2,
        0,
        spawnAreaStart +
          i * ((spawnAreaEnd - spawnAreaStart) / enemyCount) +
          Math.random() * 10,
      ] as [number, number, number],
    })),
  }));

  return (
    <>
      {entities.shrines.map((shrine) => (
    <Shrine
      key={`shrine-${shrine.id}`}
      position={shrine.position}
      rotation={[0, shrine.rotation, 0]}
      scale={shrineScale}
      visible={showShrine}
      playerPosition={position} 
    />
  ))}
      {entities.enemies.map((enemy) => (
        <Enemy
          key={`enemy-${enemy.id}`}
          position={enemy.position}
          playerPosition={position}
          triggerDistance={triggerDistance}
          scale={enemyScale}
          visible={showEnemy}
          onDamage={onDamage} 
          damagePerSecond={damagePerSecond}
        />
      ))}
    </>
  );
};

export default Entities;