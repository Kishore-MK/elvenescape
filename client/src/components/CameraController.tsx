import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraControllerProps {
  target: THREE.Vector3;
}

const CameraController: React.FC<CameraControllerProps> = ({ target }) => {
  const { camera } = useThree();
  const cameraOffset = useRef(new THREE.Vector3(0, 8, -10));

  useFrame(() => {
    // Camera follows player with offset
    const idealPosition = new THREE.Vector3(
      target.x + cameraOffset.current.x,
      target.y + cameraOffset.current.y,
      target.z + cameraOffset.current.z
    );

    // Smooth camera movement
    camera.position.lerp(idealPosition, 0.1);
    
    // Look at player
    const lookAtPosition = new THREE.Vector3(target.x, target.y + 1, target.z + 2);
    camera.lookAt(lookAtPosition);
  });

  return null;
};

export default CameraController;