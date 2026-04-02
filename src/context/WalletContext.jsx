import React, { createContext, useContext, useState, useCallback } from 'react'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { BrowserProvider, JsonRpcSigner, Contract } from 'ethers'
import { CONTRACT_ADDRESS, ABI } from '../utils/contract'

const Ctx = createContext(null)

export function WalletProvider({ children }) {
  const { address, isConnected } = useAccount()
  const chainId                  = useChainId()
  const { data: walletClient }   = useWalletClient()
  const [toasts, setToasts]      = useState([])

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  // Build ethers signer directly from window.ethereum — most reliable approach
  // wagmi already handles account/chain state; we just need ethers for contract calls
  const getProvider = () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      console.warn('[WalletContext] window.ethereum not found')
      return null
    }
    return new BrowserProvider(window.ethereum)
  }

  const getSigner = async () => {
    const p = getProvider()
    if (!p) return null
    return p.getSigner()
  }

  // Synchronous read-only contract — uses window.ethereum directly
  const getReadContract = () => {
    const p = getProvider()
    if (!p) return null
    return new Contract(CONTRACT_ADDRESS, ABI, p)
  }

  // Write contract with signer — call this inside async functions
  const getWriteContract = async () => {
    const s = await getSigner()
    if (!s) return null
    return new Contract(CONTRACT_ADDRESS, ABI, s)
  }

  // Convenience: pre-built read contract (no await needed for view calls)
  console.log('[WalletContext] isConnected:', isConnected, '| chainId:', chainId, '| CONTRACT_ADDRESS:', CONTRACT_ADDRESS)
  const readContract = isConnected ? getReadContract() : null

  // Pre-built write contract for use in components — null until wallet connected
  // Components that need to write should call getWriteContract() in their async handlers
  const [contract] = useState(() => null) // placeholder — see note below

  const isValidNetwork = chainId === 31337 || chainId === 11155111
  const networkName    = chainId === 31337    ? 'Hardhat Local'
                       : chainId === 11155111 ? 'Sepolia'
                       : chainId ? `Chain ${chainId}` : null

  return (
    <Ctx.Provider value={{
      account: address,
      chainId,
      isConnected,
      isValidNetwork,
      networkName,
      readContract,       // for view calls — use directly
      getWriteContract,   // for txs — call inside async, returns contract with signer
      toast,
    }}>
      {children}

      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} style={{ pointerEvents: 'all' }}>
            <strong style={{
              display: 'block', marginBottom: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {t.type === 'success' ? 'Done' : t.type === 'error' ? 'Error' : 'Info'}
            </strong>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useWallet = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useWallet must be inside WalletProvider')
  return c
}
