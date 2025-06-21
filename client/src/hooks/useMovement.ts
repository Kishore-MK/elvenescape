import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MovementState {
  position: THREE.Vector3;
  isMoving: boolean;
}

export const useMovement = (speed: number = 5) => {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({}); 
  const [isMoving, setIsMoving] = useState(false);
    const [position, setPosition] = useState(new THREE.Vector3(0, 0, 0));
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: true }));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update movement in the frame loop
  useFrame((_, delta) => {
  if (keys['w']) {
    setPosition(prev => {
      const newPos = prev.clone();
      newPos.z += speed * delta;
      return newPos;
    });
    setIsMoving(true);
  } else {
    setIsMoving(false);
  }
});

  return {
    position: position,
    isMoving, 
  };
};