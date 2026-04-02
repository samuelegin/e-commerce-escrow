import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat } from 'wagmi/chains'

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo'

export const wagmiConfig = getDefaultConfig({
  appName:   'EscrowNG',
  projectId:  PROJECT_ID,
  chains:    [hardhat, sepolia],
  ssr:       false,
})
