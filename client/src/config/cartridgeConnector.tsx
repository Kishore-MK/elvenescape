
import { Connector } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import { ColorMode, SessionPolicies, ControllerOptions, } from "@cartridge/controller";
import { constants } from "starknet";

const { VITE_PUBLIC_DEPLOY_TYPE } = import.meta.env;

const CONTRACT_ADDRESS_GAME = '0x3782e321a749a60101d575619f14a6e0b2a0cc7c287cb0af7137b607ee00079'

const policies: SessionPolicies = {
  contracts: {
    [CONTRACT_ADDRESS_GAME]: {
      methods: [
        { name: "initialize_player", entrypoint: "initialize_player" },
        { name: "spawn", entrypoint: "spawn" },
        { name: "step_forward", entrypoint: "step_forward" },
        { name: "attack_gatekeeper", entrypoint: "attack_gatekeeper" },
        { name: "interact_with_shrine", entrypoint: "interact_with_shrine" },
        { name: "take_damage", entrypoint: "take_damage" },
      ],
    },
  },
}

// Controller basic configuration
const colorMode: ColorMode = "dark";
const theme = "kaadugame";

const options: ControllerOptions = {
  chains: [
    {
      rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
    },
  ],
  defaultChainId: VITE_PUBLIC_DEPLOY_TYPE === 'mainnet' ?  constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA,
  policies,
  theme,
  colorMode,
  namespace: "kaadugame", 
  slot: "kaadugame", 
};

const cartridgeConnector = new ControllerConnector(
  options,
) as never as Connector;

export default cartridgeConnector;
