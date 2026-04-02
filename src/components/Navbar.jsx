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
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-left">
        {/* Logo */}
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo-grid">
            {['var(--lime)', 'var(--purple)', 'var(--purple)', 'var(--lime)'].map((c, i) => (
              <div key={i} className="navbar-logo-cell" style={{ background: c }} />
            ))}
          </div>
          ESCROW<span>NG</span>
        </Link>

        <button className="navbar-burger" onClick={() => setMenuOpen((prev) => !prev)} aria-label="Toggle navigation menu">
          ☰
        </button>
      </div>

      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {LINKS.map((l) => {
          const active = pathname === l.to
          return (
            <Link key={l.to} to={l.to} className={`navbar-link ${active ? 'active' : ''}`}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {l.label}
            </Link>
          )
        })}

        <div className="navbar-mobile-actions">
          {isConnected && networkName && (
            <span className={`network-label ${isValidNetwork ? '' : 'network-bad'}`}>
              {isValidNetwork ? `◈ ${networkName}` : `⚠ ${networkName} — switch network`}
            </span>
          )}
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus="address"
          />
        </div>
      </div>

      {/* Right — network badge + RainbowKit button */}
    <div className="navbar-right">
      {isConnected && networkName && (
        <span className={`network-label ${isValidNetwork ? '' : 'network-bad'}`}>
          {isValidNetwork ? `◈ ${networkName}` : `⚠ ${networkName} — switch network`}
        </span>
      )}

      <ConnectButton
        showBalance={false}
        chainStatus="none"
        accountStatus="address"
      />
    </div>
  </nav>
  )
}
