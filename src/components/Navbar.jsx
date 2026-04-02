import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useWallet } from '../context/WalletContext'

const LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/create',      label: 'Create'      },
  { to: '/my-escrows',  label: 'Dashboard'   },
]

export default function Navbar() {
  const { isValidNetwork, networkName, isConnected } = useWallet()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      height: 'var(--nav-h)',
      background: 'var(--cream)',
      borderBottom: scrolled ? 'var(--b2)' : 'var(--b1)',
      display: 'flex', alignItems: 'stretch',
      transition: 'border 0.15s',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 24px', borderRight: 'var(--b1)',
        fontFamily: 'var(--font-display)',
        fontSize: '1.5rem', letterSpacing: '0.04em',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, width: 20, height: 20 }}>
          {['var(--lime)', 'var(--purple)', 'var(--purple)', 'var(--lime)'].map((c, i) => (
            <div key={i} style={{ background: c, border: '1.5px solid var(--black)' }} />
          ))}
        </div>
        ESCROW<span style={{ color: 'var(--purple)' }}>NG</span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
        {LINKS.map(l => {
          const active = pathname === l.to
          return (
            <Link key={l.to} to={l.to} style={{
              display: 'flex', alignItems: 'center', padding: '0 20px',
              borderRight: 'var(--b1)',
              fontSize: '11px', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: active ? 'var(--black)' : 'transparent',
              color: active ? 'var(--cream)' : 'var(--black)',
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {l.label}
            </Link>
          )
        })}
      </div>

      {/* Right — network badge + RainbowKit button */}
      <div style={{
        display: 'flex', alignItems: 'center',
        paddingRight: 20, paddingLeft: 16, gap: 12,
        borderLeft: 'var(--b1)',
      }}>
        {isConnected && networkName && (
          <span style={{
            fontSize: '10px', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: isValidNetwork ? '#888' : 'var(--red)',
          }}>
            {isValidNetwork ? `◈ ${networkName}` : `⚠ ${networkName} — switch network`}
          </span>
        )}

        {/* RainbowKit ConnectButton — handles everything */}
        <ConnectButton
          showBalance={false}
          chainStatus="none"
          accountStatus="address"
        />
      </div>
    </nav>
  )
}
