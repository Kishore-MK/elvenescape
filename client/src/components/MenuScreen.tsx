import React, { useEffect, useState } from 'react';
import { AudioControls } from './AudioManager';
 

interface MenuScreenProps {
  onStartGame: () => void;
  audioControls: AudioControls;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ onStartGame, audioControls }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { 
    audioControls.playLobby(); 
    setTimeout(() => setIsLoaded(true), 10);
  }, [audioControls]);

  const buttonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '15px',
    padding: '15px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontFamily: '"Orbitron", "Arial", sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    margin: '10px 0',
    minWidth: '200px',
  };

  const buttonHoverStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.2))',
    border: '2px solid rgba(255,255,255,0.5)',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundImage: `url(assets/bg.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, rgba(0,0,0,0.4), rgba(0,20,40,0.6))',
          animation: 'pulse 8s infinite alternate',
        }}
      />

      {/* Floating particles effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,0.3), transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.3), transparent),
            radial-gradient(2px 2px at 160px 30px, rgba(255,255,255,0.2), transparent)
          `,
          backgroundSize: '200px 100px',
          animation: 'stars 20s linear infinite',
        }}
      />

      {/* Main content */}
      <div
        style={{
          zIndex: 10,
          textAlign: 'center',
          transform: isLoaded ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
          opacity: isLoaded ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Game Title */}
        <h1
          style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(100,150,255,0.3)',
            fontFamily: '"Orbitron", "Arial", sans-serif',
            letterSpacing: '3px',
            background: 'linear-gradient(45deg, #ffffff, #a0d8ff, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glow 3s ease-in-out infinite alternate',
          }}
        >
          FOG WALKER
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '50px',
            fontFamily: '"Arial", sans-serif',
            fontStyle: 'italic',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          Embark on an epic journey through mystical forests
        </p>

        {/* Menu Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <button
            style={buttonStyle}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
            onClick={onStartGame}
          >
            ⚔️ Start Adventure
          </button>

          <button
            style={buttonStyle}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
            onClick={() => {/* Add settings functionality later */}}
          >
            ⚙️ Settings
          </button>

          <button
            style={{...buttonStyle, opacity: 0.7}}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, {...buttonHoverStyle, opacity: 0.9})}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, {...buttonStyle, opacity: 0.7})}
            onClick={() => window.close()}
          >
            🚪 Exit
          </button>
        </div>

        {/* Audio Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            right: '-245px',
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
          }}
        >
          <button
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
            }}
            onClick={audioControls.toggleMute}
            title={audioControls.isMuted ? 'Unmute' : 'Mute'}
          >
            {audioControls.isMuted ? '🔇' : '🔊'}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={audioControls.volume}
            onChange={(e) => audioControls.setVolume(parseFloat(e.target.value))}
            style={{
              width: '100px',
              height: '5px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '5px',
              outline: 'none',
              opacity: audioControls.isMuted ? 0.5 : 1,
            }}
          />
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
          
          @keyframes pulse {
            0% { opacity: 0.8; }
            100% { opacity: 1; }
          }
          
          @keyframes stars {
            0% { transform: translateX(0) translateY(0); }
            100% { transform: translateX(-200px) translateY(-100px); }
          }
          
          @keyframes glow {
            0% { text-shadow: 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(100,150,255,0.3); }
            100% { text-shadow: 0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(100,150,255,0.6); }
          }
        `}
      </style>
    </div>
  );
};

export default MenuScreen;