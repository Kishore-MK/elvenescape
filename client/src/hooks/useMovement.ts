import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useAppStore, { GamePhase } from '../zustand/store';

interface MovementState {
  position: THREE.Vector3;
  isMoving: boolean;
}

export const useMovement = (speed: number = 5, onStep?: () => void): MovementState => {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [isMoving, setIsMoving] = useState(false);
  const [position, setPosition] = useState(new THREE.Vector3(0, 0, -120));
  const [isTouching, setIsTouching] = useState(false);
  const lastPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -120));
  const stepThreshold = 0.5; // Distance threshold to count as a step
  const distanceAccumulator = useRef<number>(0);

  // Get game state from store
  const gamePhase = useAppStore(state => state.gamePhase);

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

  // Handle touch events
  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      setIsTouching(true);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      setIsTouching(false);
    };

    const handleTouchCancel = (event: TouchEvent) => {
      event.preventDefault();
      setIsTouching(false);
    };

    // Add touch event listeners to the document
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, []);

  // Update movement in the frame loop
  useFrame((_, delta) => {
    let moveX = 0;
    let moveZ = 0;
    let moving = false;

    // Check if movement is allowed based on game state
    if (gamePhase !== GamePhase.WALKING) {
      setIsMoving(false);
      return;
    }

    // Check keyboard movement keys
    if (keys['w']) {
      moveZ += speed * delta;
      moving = true;
    }
    if (keys['s']) {
      moveZ -= speed * delta;
      moving = true;
    }

    // Check touch movement (move forward when touching)
    if (isTouching) {
      moveZ += speed * delta;
      moving = true;
    }

    setIsMoving(moving);

    if (moving) {
      setPosition(prev => {
        const newPos = prev.clone();
        newPos.x += moveX;
        newPos.z += moveZ;

        // Calculate distance moved for step counting
        const distanceMoved = lastPosition.current.distanceTo(newPos);
        distanceAccumulator.current += distanceMoved;

        // Count a step when we've moved the threshold distance
        if (distanceAccumulator.current >= stepThreshold && onStep) {
          onStep();
          distanceAccumulator.current = 0;
        }

        lastPosition.current.copy(newPos);
        return newPos;
      });
    }
  });

  return {
    position: position,
    isMoving,
  };
};