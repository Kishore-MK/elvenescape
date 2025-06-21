A 2D-style endless runner built with React Three Fiber featuring a forest theme. Players navigate an infinite looping track using W-key movement, encountering dangerous gatekeepers (mouse-controlled combat) and mysterious shrines (mouse-interactive treasure hunting with deadly traps).
The game uses GLTF forest assets (trees, rocks, bushes) arranged in repeating chunks with orthographic camera for 2D feel. Players collect gold and loot while facing increasing challenges. Clean component architecture separates player movement, combat mechanics, and procedural generation systems.
Core loop: walk forward → fight gatekeepers → risk shrine exploration → repeat with escalating difficulty in an atmospheric forest setting{
 
  "dependencies": {
    "@cartridge/connector": "0.5.9",
    "@cartridge/controller": "0.5.9",
    "@dojoengine/core": "1.2.1",
    "@dojoengine/create-burner": "1.2.1",
    "@dojoengine/predeployed-connector": "1.2.1",
    "@dojoengine/sdk": "1.2.1",
    "@dojoengine/torii-client": "1.2.1",
    "@dojoengine/torii-wasm": "1.2.1",
    "@dojoengine/utils": "1.2.1",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@starknet-react/chains": "^3.1.0",
    "@starknet-react/core": "^3.5.0",
    "@types/uuid": "^10.0.0",
    "buffer": "^6.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "immer": "^10.1.1",
    "lucide-react": "^0.512.0",
    "react": "^18.3.1,
    "react-dom": "^18.3.1,
    "@react-three/drei": "9.122.0",
    "@react-three/fiber": "^8.18.0",
    "starknet": "6.23.1",
    "tailwind-merge": "^3.3.0",
    "uuid": "^10.0.0",
    "vite-plugin-top-level-await": "^1.5.0",
    "vite-plugin-wasm": "^3.4.1",
    "zustand": "^4.5.6"
  },
  "devDependencies": {
    "@eslint/js": "^9.20.0",
    "@types/node": "^22.15.30",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.20.1",
    "eslint-plugin-react-hooks": "5.1.0-rc-fb9a90fa48-20240614",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^15.15.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.24.1",
    "vite": "^5.4.14"
  }
}
