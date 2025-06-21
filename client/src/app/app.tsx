// import { useState } from 'react';
// import { useAudioManager } from '../components/AudioManager';
// import Game from '../components/Game';
// // You'll need to create this:
// import MenuScreen from '../components/MenuScreen';

// function App() {
//   const audioControls = useAudioManager();
//   const [currentScreen, setCurrentScreen] = useState('menu');

//   if (currentScreen === 'menu') {
//     return (
//       <MenuScreen 
//         onStartGame={() => {
//           setCurrentScreen('game');
//           // Game component will handle starting game music
//         }}
//         audioControls={audioControls}
//       />
//     );
//   }

//   if (currentScreen === 'game') {
//     return (
//       <Game 
//         onReturnToMenu={() => {
//           setCurrentScreen('menu');
//           audioControls.playLobby();
//         }}
//         audioControls={audioControls}
//       />
//     );
//   }

//   return null;
// }

// export default App;

import HomePage from "../components/pages/HomeScreen";

function App() {
  return <HomePage />;
}

export default App;