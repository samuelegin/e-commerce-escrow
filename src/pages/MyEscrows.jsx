import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useMyEscrows } from '../hooks/useEscrows'
import EscrowCard from '../components/EscrowCard'
import { short } from '../utils/helpers'

const TABS = [
  { label:'All',       filter: ()=>true         },
  { label:'As Seller', filter:(e,acc)=>e.seller?.toLowerCase()===acc?.toLowerCase() },
  { label:'As Buyer',  filter:(e,acc)=>e.buyer?.toLowerCase() ===acc?.toLowerCase() },
  { label:'Pending',   filter:(e)=>e.status===0  },
  { label:'Active',    filter:(e)=>e.status===1  },
  { label:'Completed', filter:(e)=>e.status===2  },
  { label:'Cancelled', filter:(e)=>e.status===4  },
]

export default function MyEscrows() {
  const { account, isConnected } = useWallet()
  const { openConnectModal } = useConnectModal()
  const { list, loading, reload }  = useMyEscrows()
  const [tab, setTab] = useState(0)

  if (!isConnected) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{
          width:72,height:72,border:'var(--b2)',background:'var(--lime)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--font-display)',fontSize:'2.5rem',
          boxShadow:'var(--s2)',margin:'0 auto 24px',
        }}>◎</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'2rem',marginBottom:8}}>CONNECT WALLET</h2>
        <p style={{color:'#888',fontSize:'13px',marginBottom:24}}>Connect MetaMask to see your escrows.</p>
        <button className="btn btn-black btn-xl" onClick={openConnectModal}>
          'Connect Wallet'
        </button>
      </div>
    </div>
  )

  const shown = list.filter(e => TABS[tab].filter(e, account))

  return (
    <div className="page my-escrows-page">
      {/* Header */}
      <div style={{borderBottom:'var(--b2)'}}>
        <div className="wrap my-escrows-header" style={{paddingTop:36,paddingBottom:0}}>
          {/* Address chip */}
          <div style={{marginBottom:10}}>
            <span style={{
              background:'var(--lime)',border:'var(--b1)',
              padding:'5px 14px',fontSize:'12px',
              fontFamily:'var(--font-mono)',fontWeight:500,
            }}>◉ {short(account,5)}</span>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20}}>
            <h1 style={{fontFamily:'var(--font-display)',fontSize:'clamp(2.5rem,5vw,4rem)',lineHeight:1}}>
              MY ESCROWS
            </h1>
            <div style={{display:'flex',gap:0,marginBottom:4}}>
              <button className="btn" onClick={reload}>↻ Refresh</button>
              <Link to="/create" className="btn btn-lime" style={{borderLeft:'none'}}>+ New</Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="stats-strip" style={{display:'flex',gap:0,marginBottom:20}}>
            {[
              {label:'Total',     val:list.length,                                                        bg:'var(--cream)'},
              {label:'Seller',    val:list.filter(e=>e.seller?.toLowerCase()===account.toLowerCase()).length, bg:'var(--lime)'},
              {label:'Buyer',     val:list.filter(e=>e.buyer?.toLowerCase() ===account.toLowerCase()).length, bg:'var(--blue)'},
              {label:'Active',    val:list.filter(e=>e.status===1).length,                               bg:'var(--orange)'},
              {label:'Completed', val:list.filter(e=>e.status===2).length,                               bg:'var(--purple2)'},
              {label:'Cancelled', val:list.filter(e=>e.status===4).length,                               bg:'#e0e0e0'},
            ].map((s,i)=>(
              <div key={i} style={{
                padding:'10px 16px',background:s.bg,
                border:'var(--b1)',borderRight:i<4?'none':'var(--b1)',
              }}>
                <div style={{fontFamily:'var(--font-display)',fontSize:'1.4rem'}}>{s.val}</div>
                <div style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.1em',color:'#666',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="tabs-strip" style={{display:'flex',gap:0}}>
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)} style={{
                padding:'9px 16px',
                border:'var(--b1)',borderRight:i<TABS.length-1?'none':'var(--b1)',
                background:tab===i?'var(--black)':'var(--cream)',
                color:tab===i?'var(--white)':'var(--black)',
                fontSize:'10px',fontWeight:500,
                textTransform:'uppercase',letterSpacing:'0.08em',
                fontFamily:'var(--font-mono)',cursor:'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="wrap" style={{paddingTop:36,paddingBottom:60}}>
        {loading && list.length===0 && (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <span className="spin" style={{width:40,height:40,borderWidth:4}}/>
            <p style={{marginTop:16,fontSize:'13px',color:'#888'}}>Scanning your escrows…</p>
          </div>
        )}

        {!loading && shown.length===0 && (
          <div style={{border:'var(--b1)',background:'var(--white)',padding:'70px 0',textAlign:'center',boxShadow:'var(--s1)'}}>
            <div style={{fontSize:'3rem',opacity:0.2,marginBottom:14}}>◈</div>
            <h3 style={{fontFamily:'var(--font-ui)',marginBottom:8}}>No escrows here</h3>
            <p style={{color:'#888',fontSize:'13px',marginBottom:24}}>
              {tab===0?'Create your first escrow to get started.':'Try a different filter.'}
            </p>
            {tab===0 && <Link to="/create" className="btn btn-lime btn-lg">+ Create Escrow</Link>}
          </div>
        )}

        {shown.length>0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',border:'var(--b1)'}}>
            {shown.map((e,i)=>(
              <div key={e.id} style={{
                borderRight:(i+1)%4!==0?'var(--b1)':'none',
                borderBottom:'var(--b1)',
              }}>
                <EscrowCard escrow={e}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
