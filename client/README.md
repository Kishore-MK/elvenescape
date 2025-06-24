
<div align="center">

# Elven Escape 

[![Last Commit](https://img.shields.io/github/last-commit/Kishore-MK/elvenescape)](https://github.com/Kishore-MK/elvenescape/commits/main)
[![GitHub Issues](https://img.shields.io/github/issues/Kishore-MK/elvenescape)](https://github.com/Kishore-MK/elvenescape/issues)
[![GitHub Stars](https://img.shields.io/github/stars/Kishore-MK/elvenescape?style=social)](https://github.com/Kishore-MK/elvenescape/stargazers)

</div>

This repository contains the necessary context for Language Model (LLM) code questions about the "elvenescape" project. It provides an organized structure and relevant files, enabling developers to easily explore and understand the codebase using LLMs. The repository includes front-end client code, smart contract definitions, and documentation to facilitate comprehensive code analysis and question answering.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Dependencies](#dependencies)
- [Contributing](#contributing)

## Features

- **Client-Side Application:** A React-based front-end for an immersive on-chain runner game, including UI components, game logic, and state management.
- **Smart Contracts:** Cairo contracts defining game mechanics, entities, and interactions within the Starknet environment.
- **Dojo Integration:** Utilizes the Dojo framework for ECS architecture, enabling efficient management of game state and interactions.
- **Comprehensive Documentation:** Includes architectural overviews, integration guides, and extension strategies to facilitate development and understanding.
- **Asset Management:** Manages various game assets like audio files, 3D models, and images, enhancing the overall gaming experience.

## Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/Kishore-MK/elvenescape.git
    cd elvenescape
    ```

2. Navigate to the `client` directory:
   ```bash
   cd client
   ```
3.  Install the necessary dependencies:

    ```bash
    npm install
    ```

    ## .env

1.  Clone the repository:

    ```bash
    # Deploy Environment Variables
    VITE_PUBLIC_DEPLOY_TYPE=sepolia
    VITE_PUBLIC_NODE_URL=https://api.cartridge.gg/x/starknet/sepolia
    VITE_PUBLIC_TORII=https://api.cartridge.gg/x/kaadugame/torii
    VITE_PUBLIC_MASTER_ADDRESS=DEPLOYER_ACCOUNT_ADDRESS
    VITE_PUBLIC_MASTER_PRIVATE_KEY=DEPLOYER_PRIVATE_KEY
    VITE_PUBLIC_SLOT_ADDRESS=KATANA_ADDRESS
    
    # Local HTTPS flag
    VITE_LOCAL_HTTPS=true
    ```
    
## Running the Project

1.  Start the development server:

    ```bash
    npm run dev
    ```

    or using HTTPS:

    ```bash
    npm run dev:https
    ```

2.  Access the application in your browser at `http://localhost:3002`.

## Dependencies

-   **@cartridge/connector**: Integration with Cartridge for wallet management.
-   **@dojoengine/core**: Core components for the Dojo ECS framework.
-   **react**: A JavaScript library for building user interfaces.
-   **@react/three-fiber**: A JavaScript library for building 3D interfaces.
-   **starknet**: A JavaScript library for interacting with Starknet.
-   **tailwindcss**: A utility-first CSS framework for styling the application.
-   **vite**: A build tool that aims to provide a faster and leaner development experience for modern web projects.

## Contributing

Contributions are welcome! Here's how you can contribute:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with descriptive messages.
4.  Push your changes to your fork.
5.  Submit a pull request to the main repository.
 
 
