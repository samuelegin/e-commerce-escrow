import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEscrow } from '../hooks/useEscrows'
import { useWallet } from '../context/WalletContext'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { fmtEth, fmtDate, short, timeLeft, copy, naira } from '../utils/helpers'
import { STATUS_LABEL, STATUS_BADGE } from '../utils/contract'
import { ipfsUrl } from '../utils/ipfs'

export default function EscrowDetail() {
  const { id } = useParams()
  const { data:e, loading, error, reload } = useEscrow(Number(id))
  const { account, readContract, getWriteContract, toast, isValidNetwork } = useWallet()
  const { openConnectModal } = useConnectModal()
  const [txBusy, setTxBusy] = useState(null)

  // ✅ Live oracle rates for accurate NGN display
  const [ethUsd, setEthUsd] = useState(null)
  const [usdNgn, setUsdNgn] = useState(null)

  useEffect(() => {
    if (!readContract) return
    const fetchRates = async () => {
      try {
        const [usdPrice, ngnRate] = await Promise.all([
          readContract.getEthUsdPrice(),
          readContract.usdNgnRate(),
        ])
        setEthUsd(Number(usdPrice) / 1e8)
        setUsdNgn(Number(ngnRate))
      } catch {}
    }
    fetchRates()
  }, [readContract])

  const isSeller   = e?.seller?.toLowerCase() === account?.toLowerCase()
  const isBuyer    = e?.buyer && e.buyer !== '0x0000000000000000000000000000000000000000'
                   && e?.buyer?.toLowerCase() === account?.toLowerCase()
  const canDeposit = e?.status === 0 && account
                   && e?.seller?.toLowerCase() !== account?.toLowerCase()
  const tl = e ? timeLeft(e.depositedAt, e.timeout) : null

  // ✅ run() fetches write contract and passes it to the callback
  const run = async (label, fn) => {
    if (!account)        { openConnectModal(); return }
    if (!isValidNetwork) { toast('Switch to Sepolia', 'error'); return }
    setTxBusy(label)
    try {
      const contract = await getWriteContract()
      if (!contract) { toast('Contract not loaded', 'error'); return }
      const tx = await fn(contract)
      toast('Waiting for confirmation…', 'info')
      await tx.wait()
      toast(`${label} successful!`, 'success')
      reload()
    } catch (e) {
      toast(e.code === 4001 ? 'Rejected' : (e.reason || e.message), 'error')
    } finally { setTxBusy(null) }
  }

  if (loading) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <span className="spin" style={{ width:48, height:48, borderWidth:5, borderColor:'rgba(0,0,0,0.15)', borderTopColor:'var(--black)' }}/>
        <p style={{ marginTop:16, fontSize:'13px', color:'#888' }}>Loading escrow #{id}…</p>
      </div>
    </div>
  )

  if (error || !e) return (
    <div className="page">
      <div className="wrap" style={{ padding:'80px 24px', textAlign:'center' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2.5rem', marginBottom:10 }}>NOT FOUND</h2>
        <p style={{ color:'#888', marginBottom:24 }}>{error || `Escrow #${id} doesn't exist`}</p>
        <Link to="/marketplace" className="btn btn-black">← Back to Marketplace</Link>
      </div>
    </div>
  )

  const meta   = e.meta
  const imgUrl = meta?.imageCid ? ipfsUrl(meta.imageCid) : null
  const ethAmt = fmtEth(e.amount)

  return (
    <div className="page escrow-detail-page">
      <div style={{ borderBottom:'var(--b1)', padding:'14px 0' }}>
        <div className="wrap" style={{ fontSize:'11px', color:'#888', fontFamily:'var(--font-mono)' }}>
          <Link to="/marketplace" style={{ color:'#aaa' }}>Marketplace</Link>
          {' › '}
          <strong style={{ color:'var(--black)' }}>Escrow #{e.id}</strong>
        </div>
      </div>

      <div className="wrap escrow-detail-layout" style={{ paddingTop:36, paddingBottom:60 }}>
        <div className="grid two-col-layout" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:0 }}>

          {/* Main */}
          <div style={{ borderRight:'var(--b1)', paddingRight:40 }}>

            {imgUrl && (
              <div style={{ height:300, border:'var(--b1)', boxShadow:'var(--s2)', marginBottom:32, background:`url(${imgUrl}) center/cover no-repeat` }}/>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.6rem,3vw,2.4rem)', lineHeight:1.05, flex:1 }}>
                {meta?.title || `Escrow #${e.id}`}
              </h1>
              <span className={`badge ${STATUS_BADGE[e.status]}`} style={{ marginLeft:14, flexShrink:0 }}>
                ◉ {STATUS_LABEL[e.status]}
              </span>
            </div>

            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
              <span className="tag">#{e.id}</span>
              {meta?.category && <span className="tag" style={{ background:'var(--purple)' }}>{meta.category}</span>}
              {meta?.location  && <span className="tag" style={{ background:'var(--cream)', color:'var(--black)', border:'var(--b1)' }}>📍 {meta.location}</span>}
            </div>

            {meta?.description && (
              <div style={{ border:'var(--b1)', padding:'18px 20px', background:'var(--cream)', marginBottom:28, fontSize:'13px', lineHeight:1.75, color:'#444' }}>
                {meta.description}
              </div>
            )}

            {/* Parties */}
            <div style={{ border:'var(--b1)', marginBottom:24 }}>
              <div style={{ padding:'10px 18px', background:'var(--black)', color:'var(--cream)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                Escrow Parties
              </div>
              {[
                { role:'Seller', addr:e.seller, bg:'var(--lime)', you:isSeller },
                { role:'Buyer',  addr:e.buyer==='0x0000000000000000000000000000000000000000'?null:e.buyer, bg:'var(--blue)', you:isBuyer },
              ].map(p => (
                <div key={p.role} style={{ padding:'14px 18px', borderBottom:'var(--b1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ background:p.bg, padding:'3px 9px', border:'var(--b1)', fontSize:'11px', fontWeight:500 }}>
                    {p.role}{p.you?' (You)':''}
                  </span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px' }}>
                      {p.addr ? short(p.addr,6) : <em style={{ color:'#aaa' }}>Awaiting buyer…</em>}
                    </span>
                    <button onClick={() => p.addr && copy(p.addr).then(ok => ok && toast('Copied!','success'))}
                      disabled={!p.addr}
                      style={{ background:'none', border:'var(--b1)', padding:'3px 8px', fontSize:'11px', cursor:'pointer' }}>⎘</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ border:'var(--b1)' }}>
              <div style={{ padding:'10px 18px', background:'var(--black)', color:'var(--cream)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                Timeline
              </div>
              {[
                { label:'Created',   value:fmtDate(e.createdAt), done:true },
                { label:'Deposited', value:e.depositedAt&&Number(e.depositedAt)>0?fmtDate(e.depositedAt):'Awaiting…', done:e.status>=1 },
                { label:'Timeout',   value:tl?.text||'—', done:false, warn:tl?.expired },
                { label:'Final',     value:e.status===2?'Funds Released':e.status===3?'Refunded':'Pending', done:e.status>=2 },
              ].map((t, i) => (
                <div key={i} style={{ padding:'12px 18px', borderBottom:i<3?'var(--b1)':'none', display:'flex', justifyContent:'space-between', alignItems:'center', background:t.warn?'#fff7f0':'transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:18, height:18, border:'var(--b1)', background:t.done?'var(--lime)':'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700 }}>
                      {t.done?'✓':'○'}
                    </div>
                    <span style={{ fontSize:'11px', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.07em' }}>{t.label}</span>
                  </div>
                  <span style={{ fontSize:'12px', color:t.warn?'var(--orange)':'#777', fontFamily:'var(--font-mono)' }}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ paddingLeft:40 }}>
            <div style={{ position:'sticky', top:80 }}>
              <div style={{ border:'var(--b1)', background:'var(--white)', boxShadow:'var(--s2)' }}>

                {/* Price */}
                <div style={{ padding:'18px 22px', borderBottom:'var(--b1)', background:'var(--lime)' }}>
                  <div style={{ fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.1em', color:'#555', marginBottom:3 }}>Locked Amount</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem' }}>{ethAmt} ETH</div>
                  {/* ✅ Live oracle NGN conversion */}
                  <div style={{ fontSize:'12px', color:'#555', marginTop:2 }}>
                    {naira(ethAmt, ethUsd, usdNgn)}
                    {ethUsd && usdNgn && <span style={{ fontSize:'10px', color:'#777', marginLeft:6 }}>⚡ live</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding:'18px 22px', borderBottom:'var(--b1)', display:'flex', flexDirection:'column', gap:10 }}>

                  {/* ✅ BigInt cast for deposit value */}
                  {canDeposit && (
                    <button className="btn btn-lime fill" style={{ justifyContent:'center', padding:13 }}
                      onClick={() => run('Deposit', c => c.deposit(e.id, { value: BigInt(e.amount) }))}
                      disabled={!!txBusy}>
                      {txBusy==='Deposit' ? <><span className="spin"/>Depositing…</> : '↓ Buy This Item'}
                    </button>
                  )}

                  {isSeller && e.status===0 && (
                    <button className="btn fill" style={{ justifyContent:'center', padding:13, background:'#fff0f0', borderColor:'var(--red)' }}
                      onClick={() => run('Cancel', c => c.cancelEscrow(e.id))} disabled={!!txBusy}>
                      {txBusy==='Cancel' ? <><span className="spin"/>Cancelling…</> : '✕ Cancel Listing'}
                    </button>
                  )}

                  {isBuyer && e.status===1 && (
                    <button className="btn btn-black fill" style={{ justifyContent:'center', padding:13 }}
                      onClick={() => run('Confirm Delivery', c => c.confirmDelivery(e.id))} disabled={!!txBusy}>
                      {txBusy==='Confirm Delivery' ? <><span className="spin" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }}/>Confirming…</> : '✓ Confirm Delivery'}
                    </button>
                  )}

                  {isBuyer && e.status===1 && tl?.expired && (
                    <button className="btn fill" style={{ justifyContent:'center', padding:13, background:'#fff0f0', borderColor:'var(--red)' }}
                      onClick={() => run('Claim Refund', c => c.claimRefund(e.id))} disabled={!!txBusy}>
                      {txBusy==='Claim Refund' ? <><span className="spin"/>Processing…</> : '↩ Claim Refund'}
                    </button>
                  )}

                  {e.status===2 && <div style={{ padding:14, background:'var(--lime)', border:'var(--b1)', textAlign:'center' }}><div style={{ fontWeight:700 }}>✓ Completed</div><div style={{ fontSize:'12px', marginTop:3 }}>Funds released to seller</div></div>}
                  {e.status===3 && <div style={{ padding:14, background:'var(--pink)', border:'var(--b1)', textAlign:'center' }}><div style={{ fontWeight:700 }}>↩ Refunded</div><div style={{ fontSize:'12px', marginTop:3 }}>Funds returned to buyer</div></div>}
                  {e.status===4 && <div style={{ padding:14, background:'#f0f0f0', border:'var(--b1)', textAlign:'center' }}><div style={{ fontWeight:700 }}>✕ Cancelled</div><div style={{ fontSize:'12px', marginTop:3 }}>Seller cancelled this listing</div></div>}

                  {!account && <div style={{ padding:12, border:'var(--b1)', background:'var(--cream)', fontSize:'12px', color:'#888', textAlign:'center' }}>Connect wallet to interact</div>}
                  {account && !isBuyer && !isSeller && e.status===0 && (
                    <div style={{ padding:12, border:'var(--b1)', background:'var(--cream)', fontSize:'12px', color:'#888', textAlign:'center' }}>
                      You are not a party in this escrow
                    </div>
                  )}
                </div>

                <div style={{ padding:'12px 22px', borderBottom:'var(--b1)', background:'var(--cream)' }}>
                  <div style={{ fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.1em', color:'#999', marginBottom:4 }}>IPFS CID</div>
                  <a href={`https://gateway.pinata.cloud/ipfs/${e.cid}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:'10px', fontFamily:'var(--font-mono)', color:'var(--purple)', textDecoration:'underline', wordBreak:'break-all' }}>
                    {e.cid?.slice(0,28)}…
                  </a>
                </div>

                <div style={{ padding:'14px 22px', display:'flex', flexDirection:'column', gap:8 }}>
                  <a href={`https://sepolia.etherscan.io/address/${e.seller}`} target="_blank" rel="noopener noreferrer"
                    className="btn fill" style={{ justifyContent:'center', fontSize:'11px', boxShadow:'none' }}>
                    View on Etherscan ↗
                  </a>
                  <button className="btn fill" style={{ justifyContent:'center', fontSize:'11px', boxShadow:'none' }}
                    onClick={() => copy(window.location.href).then(ok => ok && toast('Link copied!','success'))}>
                    ⎘ Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
