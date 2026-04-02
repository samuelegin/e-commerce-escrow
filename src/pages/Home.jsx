import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useConnectModal } from '@rainbow-me/rainbowkit'

// Fetch live stats from the contract
function useLiveStats() {
  const { readContract } = useWallet()
  const c = readContract
  const [stats, setStats] = useState({ count: null, ethLocked: null })

  useEffect(() => {
    if (!c) return
    let cancelled = false

    async function load() {
      try {
        const count = await c.escrowCount()
        const total = Number(count)

        const provider  = c.runner?.provider || c.provider
        const latest    = await provider.getBlockNumber()
        const fromBlock = Math.max(0, latest - 10000)
        const events    = await c.queryFilter(c.filters.EscrowCreated(), fromBlock, 'latest')

        let totalWei = 0n
        for (const ev of events) {
          try {
            totalWei += ev.args.amount
          } catch {}
        }

        const ethLocked = parseFloat(
          (Number(totalWei) / 1e18).toFixed(3)
        )

        if (!cancelled) setStats({ count: total, ethLocked })
      } catch {
        // silently fail — stats are optional display only
      }
    }

    load()
    return () => { cancelled = true }
  }, [c])

  return stats
}

/* ── Floating geometric shape ── */
function Shape({ style, color='var(--lime)', children, anim='float1' }) {
  return (
    <div style={{
      border:'var(--b1)', background:color,
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:`${anim} ${3+Math.random()*2}s ease-in-out infinite`,
      animationDelay:`${Math.random()*1.5}s`,
      ...style,
    }}>{children}</div>
  )
}

/* ── Marquee strip ── */
function Marquee() {
  const items = [
    '◆ Trustless Escrow','● No Middleman','■ IPFS Storage',
    '▲ Ethereum Sepolia','✦ Smart Contracts','◉ Nigerian Markets',
    '◆ Trustless Escrow','● No Middleman','■ IPFS Storage',
    '▲ Ethereum Sepolia','✦ Smart Contracts','◉ Nigerian Markets',
  ]
  return (
    <div className="marquee-wrap">
      <div className="marquee-inner">
        {items.map((t,i)=>(
          <span key={i} className="marquee-item">
            <span className="marquee-dot">◆</span>{t}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { account, isConnected } = useWallet()
  const { openConnectModal } = useConnectModal()
  const { count, ethLocked } = useLiveStats()

  return (
    <>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="home-hero">
        {/* LEFT */}
        <div className="home-hero-left">
          <div>
            {/* eyebrow */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
              <span style={{
                background:'var(--black)', color:'var(--lime)',
                padding:'5px 12px', fontSize:'10px',
                fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.1em',
              }}>◉ Live on Sepolia Testnet</span>
            </div>

            {/* Main headline */}
            <h1 style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(4rem,8vw,7rem)',
              lineHeight:0.95,
              letterSpacing:'0.02em',
              marginBottom:28,
            }}>
              ZERO<br/>
              TRUST<br/>
              <span style={{
                display:'inline-block',
                background:'var(--lime)',
                padding:'2px 12px',
                border:'var(--b2)',
                boxShadow:'var(--s2)',
              }}>ESCROW</span>
            </h1>

            <p style={{
              fontFamily:'var(--font-mono)', fontSize:'14px',
              lineHeight:1.75, color:'#444',
              maxWidth:400, marginBottom:40,
            }}>
              No more scams. No "send money first." 
              Smart contracts lock your ETH until the buyer 
              confirms delivery — fully on-chain, fully trustless.
            </p>

            <div style={{ display:'flex', gap:0 }}>
              {isConnected ? (
                <>
                  <Link to="/marketplace" className="btn btn-black btn-xl">Browse Market →</Link>
                  <Link to="/create" className="btn btn-lime btn-xl" style={{ borderLeft:'none' }}>Create Escrow ↗</Link>
                </>
              ) : (
                <>
                  <button onClick={openConnectModal} className="btn btn-black btn-xl">
                    Connect Wallet
                  </button>
                  <Link to="/marketplace" className="btn btn-xl" style={{ borderLeft:'none' }}>View Market →</Link>
                </>
              )}
            </div>
          </div>

          {/* Bottom stats — live from blockchain */}
          <div className="home-stats">
            {[
              { n: count    !== null ? `${count}`        : '—', l:'Total Escrows', bg:'var(--lime)'    },
              { n: ethLocked !== null ? `${ethLocked}`   : '—', l:'ETH in Escrows', bg:'var(--purple2)' },
              { n: count    !== null ? (count === 0 ? '—' : '100%') : '—', l:'Dispute-Free', bg:'var(--pink)' },
            ].map((s,i)=>(
              <div key={i} style={{ borderRight: i<2?'var(--b1)':'none', paddingRight:20, paddingLeft:i?20:0 }}>
                <div style={{
                  fontFamily:'var(--font-display)', fontSize:'2.5rem',
                  background:s.bg, display:'inline-block',
                  padding:'0 6px', border:'var(--b1)', boxShadow:'var(--s1)',
                }}>{s.n}</div>
                <div style={{ fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em', color:'#888', marginTop:4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — geometric art canvas */}
        <div className="home-hero-right">
          {/* Dot grid bg */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:'radial-gradient(circle, rgba(10,10,10,0.12) 1.5px, transparent 1.5px)',
            backgroundSize:'26px 26px',
          }}/>

          {/* Art shapes */}
          <div style={{ position:'relative', width:420, height:420 }}>

            {/* Large COLLECT-style pill */}
            <Shape color="var(--lime)" anim="float1" style={{
              position:'absolute', top:'28%', left:'8%',
              width:200, height:52,
              fontFamily:'var(--font-display)', fontSize:'1.4rem', letterSpacing:'0.06em',
              boxShadow:'var(--s2)',
            }}>SECURE ◆</Shape>

            {/* Purple circle */}
            <Shape color="var(--purple)" anim="float2" style={{
              position:'absolute', top:'8%', right:'8%',
              width:82, height:82, borderRadius:'50%',
              boxShadow:'var(--s1)',
            }}/>

            {/* Pink diamond */}
            <Shape color="var(--pink)" anim="float3" style={{
              position:'absolute', bottom:'22%', left:'6%',
              width:58, height:58,
              boxShadow:'var(--s1)',
            }}/>

            {/* Blue rect tag */}
            <Shape color="var(--blue)" anim="float2" style={{
              position:'absolute', top:'58%', right:'5%',
              width:140, height:46,
              fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:500,
              boxShadow:'var(--s1)',
            }}>TRUSTLESS</Shape>

            {/* Orange pill — ETH */}
            <Shape color="var(--orange)" anim="float1" style={{
              position:'absolute', bottom:'12%', left:'32%',
              width:120, height:42,
              fontFamily:'var(--font-display)', fontSize:'1.2rem',
              boxShadow:'var(--s1)',
            }}>Ξ ETH</Shape>

            {/* Spinning plus */}
            <div style={{
              position:'absolute', top:'3%', left:'28%',
              fontFamily:'var(--font-display)', fontSize:'3.5rem', opacity:0.15,
              animation:'spinSlow 12s linear infinite',
            }}>✛</div>

            {/* Wavy SVG lines */}
            <svg style={{ position:'absolute', bottom:'18%', right:'2%', opacity:0.5 }}
              width="90" height="38" viewBox="0 0 90 38">
              {[0,10,20].map(y=>(
                <path key={y}
                  d={`M0 ${19+y} Q22 ${9+y} 45 ${19+y} Q67 ${29+y} 90 ${19+y}`}
                  fill="none" stroke="var(--black)" strokeWidth="2.5"/>
              ))}
            </svg>

            {/* Small accent dots */}
            {[[10,10],['70%',20],[20,'72%']].map(([x,y],i)=>(
              <div key={i} style={{
                position:'absolute', left:x, top:y,
                width:12, height:12,
                background:['var(--black)','var(--purple)','var(--lime)'][i],
                borderRadius:'50%', border:'var(--b1)',
              }}/>
            ))}

            {/* Arrows decoration (like the ref image) */}
            <div style={{
              position:'absolute', top:'18%', left:'42%',
              fontSize:'1.8rem', opacity:0.18,
              animation:'float2 4s ease-in-out infinite 1s',
            }}>⊕</div>

          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <Marquee />

      {/* ── HOW IT WORKS ── */}
      <section style={{ borderBottom:'var(--b2)' }}>
        <div className="sec-label"><span>How It Works</span></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
          {[
            { n:'01', title:'Connect',  desc:'Link MetaMask to Sepolia testnet. One click.',    color:'var(--lime)'    },
            { n:'02', title:'Create',   desc:'Seller uploads item to IPFS, sets price & buyer.',color:'var(--purple2)' },
            { n:'03', title:'Deposit',  desc:'Buyer locks ETH in the smart contract.',           color:'var(--pink)'    },
            { n:'04', title:'Release',  desc:'Buyer confirms delivery → funds auto-release.',   color:'var(--blue)'    },
          ].map((s,i)=>(
            <div key={i} style={{
              padding:'40px 32px',
              borderRight: i<3?'var(--b1)':'none',
            }}>
              <div style={{
                width:52, height:52, border:'var(--b1)', background:s.color,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-display)', fontSize:'1.1rem',
                boxShadow:'var(--s1)', marginBottom:20,
              }}>{s.n}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', letterSpacing:'0.04em', marginBottom:10 }}>
                {s.title}
              </h3>
              <p style={{ fontSize:'13px', color:'#555', lineHeight:1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAR ── */}
      <section className="home-cta-grid">
        {[
          { to:'/marketplace', label:'Browse Market',  bg:'var(--cream)', icon:'→' },
          { to:'/create',      label:'Create Escrow',  bg:'var(--lime)',  icon:'↗' },
          { to:'/my-escrows',  label:'My Dashboard',   bg:'var(--black)', icon:'◎', light:true },
        ].map((c,i)=>(
          <Link key={i} to={c.to} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'36px 44px',
            background:c.bg, color:c.light?'var(--cream)':'var(--black)',
            borderRight:i<2?'var(--b2)':'none',
            fontFamily:'var(--font-display)', fontSize:'clamp(1.2rem,2.2vw,1.6rem)', letterSpacing:'0.04em',
            transition:'opacity 0.12s',
          }}
          onMouseEnter={e=>e.currentTarget.style.opacity='0.82'}
          onMouseLeave={e=>e.currentTarget.style.opacity='1'}
          >
            {c.label}
            <span style={{ fontSize:'2rem' }}>{c.icon}</span>
          </Link>
        ))}
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'28px 32px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>
          ESCROW<span style={{ color:'var(--purple)' }}>NG</span>
        </div>
        <div style={{ fontSize:'11px', color:'#999', fontFamily:'var(--font-mono)' }}>
          Ethereum · Sepolia Testnet · IPFS
        </div>
      </footer>
    </>
  )
}
