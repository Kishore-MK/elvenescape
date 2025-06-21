import React, { useEffect, useRef, useState } from 'react';
import lobbyMusic from '/assets/audio/lobby.mp3';
import gameMusic from '/assets/audio/game.mp3';

export type AudioState = 'lobby' | 'game' | 'stopped';

export interface AudioControls {
  playLobby: () => void;
  playGame: () => void;
  stopAll: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  initializeAudio: () => void;
  isMuted: boolean;
  volume: number;
  currentState: AudioState;
  isInitialized: boolean;
}

export const useAudioManager = (): AudioControls => {
  const lobbyAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentState, setCurrentState] = useState<AudioState>('stopped');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio elements
  useEffect(() => {
    lobbyAudioRef.current = new Audio(lobbyMusic);
    gameAudioRef.current = new Audio(gameMusic);

    const lobbyAudio = lobbyAudioRef.current;
    const gameAudio = gameAudioRef.current;

    // Set initial properties
    lobbyAudio.loop = true;
    gameAudio.loop = true;
    lobbyAudio.volume = volume;
    gameAudio.volume = volume;

    // Preload audio files
    lobbyAudio.preload = 'auto';
    gameAudio.preload = 'auto';

    // Cleanup on unmount
    return () => {
      lobbyAudio.pause();
      gameAudio.pause();
      lobbyAudio.src = '';
      gameAudio.src = '';
    };
  }, []);

  // Update volume when changed
  useEffect(() => {
    if (lobbyAudioRef.current) lobbyAudioRef.current.volume = isMuted ? 0 : volume;
    if (gameAudioRef.current) gameAudioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const stopAll = () => {
    if (lobbyAudioRef.current) {
      lobbyAudioRef.current.pause();
      lobbyAudioRef.current.currentTime = 0;
    }
    if (gameAudioRef.current) {
      gameAudioRef.current.pause();
      gameAudioRef.current.currentTime = 0;
    }
    setCurrentState('stopped');
  };

  const initializeAudio = async () => {
    if (isInitialized) return;
    
    try {
      // Try to play and immediately pause to unlock audio context
      if (lobbyAudioRef.current) {
        await lobbyAudioRef.current.play();
        lobbyAudioRef.current.pause();
        lobbyAudioRef.current.currentTime = 0;
      }
      setIsInitialized(true);
    } catch (error) {
      console.warn('Audio not yet unlocked, will retry on user interaction');
    }
  };

  const playLobby = async () => {
    if (!lobbyAudioRef.current) return;

    try {
      // Initialize audio context if needed
      if (!isInitialized) {
        await initializeAudio();
      }

      // Stop game music first
      if (gameAudioRef.current) {
        gameAudioRef.current.pause();
        gameAudioRef.current.currentTime = 0;
      }

      // Play lobby music
      await lobbyAudioRef.current.play();
      setCurrentState('lobby');
    } catch (error) {
      console.warn('Failed to play lobby music:', error);
      // Don't throw error, just log it
    }
  };

  const playGame = async () => {
    if (!gameAudioRef.current) return;

    try {
      // Stop lobby music first
      if (lobbyAudioRef.current) {
        lobbyAudioRef.current.pause();
        lobbyAudioRef.current.currentTime = 0;
      }

      // Play game music
      await gameAudioRef.current.play();
      setCurrentState('game');
    } catch (error) {
      console.warn('Failed to play game music:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  };

  return {
    playLobby,
    playGame,
    stopAll,
    toggleMute,
    setVolume,
    initializeAudio,
    isMuted,
    volume,
    currentState,
    isInitialized,
  };
};

// Optional: AudioManager component for context provider approach
export const AudioManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioControls = useAudioManager();

  return (
    <AudioContext.Provider value={audioControls}>
      {children}
    </AudioContext.Provider>
  );
};

export const AudioContext = React.createContext<AudioControls | null>(null);

export const useAudio = () => {
  const context = React.useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioManagerProvider');
  }
  return context;
};