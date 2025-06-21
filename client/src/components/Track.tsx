import React, { useMemo } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';

// Types
interface ForestAssetProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  modelId: number;
  type: 'tree' | 'rock';
}

interface ForestChunkProps {
  position: [number, number, number];
  chunkId: number;
}

interface AssetItem {
  id: string;
  type: 'tree' | 'rock';
  modelId: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

interface ChunkData {
  id: number;
  position: [number, number, number];
}

interface TrackProps {
  playerPosition?: THREE.Vector3;
}

// GLTF Asset component with separate asset folders
const ForestAsset: React.FC<ForestAssetProps> = ({ 
  position, 
  rotation, 
  scale = 1, 
  modelId,
  type = 'tree'
}) => {
  const assetFolder = type === 'tree' ? 'trees' : 'rocks';
  const modelPath = `/assets/${assetFolder}/model${modelId}.gltf`;
  const { scene } = useGLTF(modelPath);

  return (
    <Clone 
      object={scene} 
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
};

// Define safe zones - path is from -2 to +2, so we need clear boundaries
const SAFE_ZONES = {
  LEFT: { min: -8, max: -18 },  // Left side: -12 to -4
  RIGHT: { min: 7, max: 12 }    // Right side: +4 to +12
};

// Helper function to generate position in safe zone
const generateSafePosition = (side: 'left' | 'right'): number => {
  const zone = side === 'left' ? SAFE_ZONES.LEFT : SAFE_ZONES.RIGHT;
  return zone.min + Math.random() * (zone.max - zone.min);
};

// Forest chunk component that contains multiple assets
const ForestChunk: React.FC<ForestChunkProps> = ({ position, chunkId }) => {
  const assets = useMemo((): AssetItem[] => {
    const items: AssetItem[] = [];
    
    // Generate trees on both sides of the path with guaranteed safe positioning
    for (let i = 0; i < 8; i++) {
      // Left side trees
      const leftTreeX = generateSafePosition('left');
      const leftTreeZ = (i * 2) + Math.random() * 1.5;
      
      const treeModelId = Math.floor(Math.random() * 3);
      items.push({
        id: `tree-left-${chunkId}-${i}`,
        type: 'tree',
        modelId: treeModelId,
        position: [
          position[0] + leftTreeX, 
          position[1], 
          position[2] + leftTreeZ
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.6
      });

      // Right side trees
      const rightTreeX = generateSafePosition('right');
      const rightTreeZ = (i * 2) + Math.random() * 1.5;
      
      const treeModelId2 = Math.floor(Math.random() * 3);
      items.push({
        id: `tree-right-${chunkId}-${i}`,
        type: 'tree',
        modelId: treeModelId2,
        position: [
          position[0] + rightTreeX, 
          position[1], 
          position[2] + rightTreeZ
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.6
      });
    }

    // Add rocks and bushes with guaranteed safe positioning
    for (let i = 0; i < 12; i++) {
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const rockX = generateSafePosition(side);
      const rockZ = Math.random() * 16;
      const rockModelId = Math.floor(Math.random() * 4);
      
      items.push({
        id: `rock-${chunkId}-${i}`,
        type: 'rock',
        modelId: rockModelId,
        position: [
          position[0] + rockX, 
          position[1], 
          position[2] + rockZ
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.3 + Math.random() * 0.4
      });
    }

    return items;
  }, [position, chunkId]);

  return (
    <group>
      {assets.map((asset: AssetItem) => (
        <ForestAsset
          key={asset.id}
          position={asset.position}
          rotation={asset.rotation}
          scale={asset.scale}
          modelId={asset.modelId}
          type={asset.type}
        />
      ))}
    </group>
  );
};

// Main path/track component with extended static range
const Track: React.FC<TrackProps> = () => {
  const chunks = useMemo((): ChunkData[] => {
    const chunkList: ChunkData[] = [];
    const chunkLength = 16;
    
    // Create 25 chunks for extended coverage: from -200 to +200 (400 units total)
    for (let i = 0; i < 25; i++) {
      chunkList.push({
        id: i,
        position: [0, 0, (i - 12) * chunkLength] // Start at -192, end at +192
      });
    }
    
    return chunkList;
  }, []);

  return (
    <group>
      {/* Ground path - walking area (4 units wide) */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 400]} />
        <meshLambertMaterial color="#8B7355" />
      </mesh>
      
      {/* Forest chunks */}
      {chunks.map((chunk: ChunkData) => (
        <ForestChunk
          key={chunk.id}
          position={chunk.position}
          chunkId={chunk.id}
        />
      ))}
      
      {/* Ground plane - very wide and long */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 400]} />
        <meshLambertMaterial color="#4a5d23" />
      </mesh>
    </group>
  );
};

export default Track;