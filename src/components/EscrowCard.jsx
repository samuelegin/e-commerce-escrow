import React from 'react'
import { Link } from 'react-router-dom'
import { fmtEth, short, fmtDate, naira } from '../utils/helpers'
import { STATUS_LABEL, STATUS_BADGE } from '../utils/contract'
import { ipfsUrl } from '../utils/ipfs'

// accent per escrow id — cycles through palette
const ACCENTS = ['var(--lime)','var(--purple2)','var(--pink)','var(--blue)','var(--orange)']
const GLYPHS  = ['◆','●','■','▲','✦','◉','⬡']

export default function EscrowCard({ escrow }) {
  const accent  = ACCENTS[escrow.id % ACCENTS.length]
  const glyph   = GLYPHS[escrow.id % GLYPHS.length]
  const meta    = escrow.meta
  const imgUrl  = meta?.imageCid ? ipfsUrl(meta.imageCid) : null

  return (
    <Link to={`/escrow/${escrow.id}`}>
      <article style={{
        border:'var(--b1)', background:'var(--white)',
        boxShadow:'var(--s1)', height:'100%',
        display:'flex', flexDirection:'column',
        transition:'transform 0.12s, box-shadow 0.12s',
        overflow:'hidden',
      }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-3px,-3px)'; e.currentTarget.style.boxShadow='var(--s2)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none';                 e.currentTarget.style.boxShadow='var(--s1)' }}
      >
        {/* Thumb */}
        <div style={{
          height:148, flexShrink:0,
          background: imgUrl ? `url(${imgUrl}) center/cover no-repeat` : accent,
          borderBottom:'var(--b1)',
          position:'relative',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {!imgUrl && (
            <span style={{ fontSize:'3rem', opacity:0.35 }}>{glyph}</span>
          )}
          {/* Overlays */}
          <span className={`badge ${STATUS_BADGE[escrow.status]}`} style={{ position:'absolute', top:8, left:8 }}>
            {STATUS_LABEL[escrow.status]}
          </span>
          <span className="tag" style={{ position:'absolute', top:8, right:8 }}>
            #{escrow.id}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, flex:1 }}>
          <div style={{
            fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'0.95rem',
            lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {meta?.title || `Escrow #${escrow.id}`}
          </div>

          {meta?.category && (
            <span className="tag" style={{ background:'var(--purple)', alignSelf:'flex-start' }}>
              {meta.category}
            </span>
          )}

          {meta?.description && (
            <p style={{ fontSize:'12px', color:'#666', lineHeight:1.55,
              overflow:'hidden', display:'-webkit-box',
              WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
              {meta.description}
            </p>
          )}

          <div style={{ marginTop:'auto', paddingTop:10, borderTop:'var(--b1)',
            display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div>
              <div style={{ fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.1em', color:'#999', marginBottom:2 }}>Amount</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.35rem' }}>
                {fmtEth(escrow.amount)} ETH
              </div>
              <div style={{ fontSize:'10px', color:'#888' }}>{naira(fmtEth(escrow.amount))}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.1em', color:'#999', marginBottom:2 }}>Seller</div>
              <div style={{ fontSize:'11px', fontFamily:'var(--font-mono)' }}>{short(escrow.seller)}</div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
