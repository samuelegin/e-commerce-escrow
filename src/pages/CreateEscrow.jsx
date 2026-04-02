import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { uploadItem } from '../utils/ipfs'
import { CATEGORIES, TIMEOUTS } from '../utils/helpers'

const STEPS = ['Details', 'IPFS Upload', 'Sign TX', 'Done']

// Live NGN→ETH conversion — queries contract oracle
function usePriceQuote(ngnAmount, readContract) {
  const [ethWei,  setEthWei]  = useState(null)
  const [ethUsd,  setEthUsd]  = useState(null)
  const [usdNgn,  setUsdNgn]  = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const n = parseFloat(ngnAmount)
    if (!readContract || !n || n <= 0) { setEthWei(null); return }
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        const [wei, usdPrice, ngnRate] = await Promise.all([
          readContract.ngnToEth(BigInt(Math.round(n))),
          readContract.getEthUsdPrice(),
          readContract.usdNgnRate(),
        ])
        if (!cancelled) {
          setEthWei(wei)
          setEthUsd(Number(usdPrice) / 1e8)
          setUsdNgn(Number(ngnRate))
        }
      } catch {
        if (!cancelled) setEthWei(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const t = setTimeout(run, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [ngnAmount, readContract])

  return { ethWei, ethUsd, usdNgn, loading }
}

export default function CreateEscrow() {
  const { account, readContract, getWriteContract, toast, isValidNetwork } = useWallet()
  const { openConnectModal } = useConnectModal()
  const nav = useNavigate()

  const [f, setF] = useState({
    title: '', description: '', category: '', location: '',
    ngnPrice: '', timeout: TIMEOUTS[1].val, img: null,
  })
  const [preview, setPreview] = useState(null)
  const [step,    setStep]    = useState(0)
  const [txHash,  setTxHash]  = useState(null)
  const [err,     setErr]     = useState({})

  const { ethWei, ethUsd, usdNgn, loading: quoteLoading } = usePriceQuote(f.ngnPrice, readContract)

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const onImg = e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast('Image must be under 10MB', 'error'); return }
    setF(p => ({ ...p, img: file }))
    setPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const e = {}
    if (!f.title.trim())                              e.title = 'Required'
    if (!f.description.trim())                        e.desc  = 'Required'
    if (!f.ngnPrice || parseFloat(f.ngnPrice) < 100) e.price = 'Minimum ₦100'
    if (!ethWei)                                      e.price = 'Waiting for price quote…'
    setErr(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!account)        { openConnectModal(); return }
    if (!isValidNetwork) { toast('Switch to Hardhat or Sepolia', 'error'); return }
    if (!validate())     return

    // ✅ Get write contract before doing anything
    const contract = await getWriteContract()
    if (!contract) { toast('Contract not loaded', 'error'); return }

    try {
      // Step 1 — Upload to IPFS
      setStep(1)
      toast('Uploading to IPFS…', 'info')
      const cid = await uploadItem({
        title: f.title, description: f.description,
        category: f.category, location: f.location,
        ngnPrice: f.ngnPrice, imageFile: f.img,
      })
      toast(`IPFS: ${cid.slice(0, 16)}…`, 'success')

      // Step 2 — Re-fetch fresh price just before TX
      setStep(2)
      toast('Fetching live price…', 'info')
      const freshWei = await readContract.ngnToEth(BigInt(Math.round(parseFloat(f.ngnPrice))))

      toast('Confirm in wallet…', 'info')
      const tx = await contract.createEscrow(
        cid,
        BigInt(Math.round(parseFloat(f.ngnPrice))),
        f.timeout,
        { value: freshWei }
      )
      setTxHash(tx.hash)
      toast('Waiting for confirmation…', 'info')
      const receipt = await tx.wait()

      let eid = null
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log)
          if (parsed?.name === 'EscrowCreated') { eid = Number(parsed.args.escrowId); break }
        } catch {}
      }

      setStep(3)
      toast('Listed!', 'success')
      setTimeout(() => nav(eid != null ? `/escrow/${eid}` : '/marketplace'), 1800)

    } catch (e) {
      setStep(0)
      toast(e.code === 4001 ? 'Rejected' : (e.reason || e.message || 'Error'), 'error')
    }
  }

  const busy = step === 1 || step === 2

  const fmtEth = (wei) => {
    if (!wei) return '—'
    return parseFloat(ethers.formatEther(wei)).toFixed(5) + ' ETH'
  }

  const fmtNgn = (n) =>
    Number(n).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })

  if (!account) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'4rem', marginBottom:16, opacity:0.2 }}>◎</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', marginBottom:8 }}>Connect Wallet First</h2>
        <p style={{ color:'#888', fontSize:'13px', marginBottom:24 }}>You need a wallet to create a listing.</p>
        <button className="btn btn-black btn-lg" onClick={openConnectModal}>Connect Wallet</button>
      </div>
    </div>
  )

  return (
    <div className="page create-escrow-page">
      <div style={{ borderBottom:'var(--b2)' }}>
        <div className="wrap" style={{ paddingTop:36, paddingBottom:0 }}>
          <p style={{ fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.12em', color:'#888', marginBottom:6 }}>
            Seller Flow
          </p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,4vw,3.5rem)', lineHeight:1, marginBottom:24 }}>
            LIST ITEM
          </h1>
          <div style={{ display:'flex', gap:0 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                padding:'10px 20px',
                border:'var(--b1)', borderRight: i < STEPS.length-1 ? 'none' : 'var(--b1)',
                background: step===i ? 'var(--black)' : step>i ? 'var(--lime)' : 'var(--cream)',
                color: step===i ? 'var(--white)' : 'var(--black)',
                fontSize:'10px', fontWeight:500,
                textTransform:'uppercase', letterSpacing:'0.09em', fontFamily:'var(--font-mono)',
              }}>
                {step>i ? '✓ ' : ''}{String(i+1).padStart(2,'0')} {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap create-escrow-layout" style={{ paddingTop:40, paddingBottom:60 }}>
        <div className="grid two-col-layout" style={{ display:'grid', gap:20 }}>

          {/* Form */}
          <div style={{ paddingRight:0, display:'flex', flexDirection:'column', gap:22 }}>

            <div className="field">
              <label className="label">Item Image (optional · pinned to IPFS)</label>
              <div
                onClick={() => !busy && document.getElementById('img-input').click()}
                style={{
                  height:180, border:'var(--b1)',
                  background: preview ? `url(${preview}) center/cover no-repeat` : 'var(--cream)',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  cursor: busy ? 'default' : 'pointer', gap:8, color:'#aaa', fontSize:'12px',
                }}
              >
                {!preview && (<><span style={{ fontSize:'2.5rem', opacity:0.3 }}>⊕</span><span>Click to upload image</span><span style={{ fontSize:'11px' }}>Max 10MB · stored on IPFS</span></>)}
              </div>
              <input id="img-input" type="file" accept="image/*" onChange={onImg} style={{ display:'none' }} disabled={busy} />
            </div>

            <div className="field">
              <label className="label">Item Title *</label>
              <input className={`input ${err.title ? 'input-error' : ''}`}
                placeholder="e.g. iPhone 15 Pro, 256GB — Lagos"
                value={f.title} onChange={set('title')} disabled={busy} />
              {err.title && <span style={{ fontSize:'11px', color:'var(--red)' }}>{err.title}</span>}
            </div>

            <div className="field">
              <label className="label">Description *</label>
              <textarea className={`input ${err.desc ? 'input-error' : ''}`}
                rows={4} placeholder="Condition, specs, what's included, how delivery works…"
                value={f.description} onChange={set('description')} disabled={busy} />
              {err.desc && <span style={{ fontSize:'11px', color:'var(--red)' }}>{err.desc}</span>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="field">
                <label className="label">Category</label>
                <select className="input" value={f.category} onChange={set('category')} disabled={busy}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. Lagos, Abuja…"
                  value={f.location} onChange={set('location')} disabled={busy} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="field">
                <label className="label">Price (₦ NGN) *</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:'#666', pointerEvents:'none' }}>₦</span>
                  <input
                    className={`input ${err.price ? 'input-error' : ''}`}
                    type="number" min="100" step="100" placeholder="50000"
                    value={f.ngnPrice} onChange={set('ngnPrice')} disabled={busy}
                    style={{ paddingLeft:26 }}
                  />
                </div>
                {err.price && <span style={{ fontSize:'11px', color:'var(--red)' }}>{err.price}</span>}
                {f.ngnPrice && (
                  <div style={{ marginTop:8, padding:'10px 12px', background:'var(--lime)', border:'var(--b1)', fontSize:'12px', lineHeight:1.6 }}>
                    {quoteLoading ? (
                      <span style={{ color:'#666' }}>⟳ Fetching live rate…</span>
                    ) : ethWei ? (
                      <>
                        <div style={{ fontWeight:700, fontSize:'14px' }}>= {fmtEth(ethWei)}</div>
                        <div style={{ color:'#555', fontSize:'11px', marginTop:2 }}>
                          ETH/USD: ${ethUsd?.toFixed(2)} · USD/NGN: ₦{usdNgn?.toLocaleString()}
                        </div>
                        <div style={{ color:'#777', fontSize:'10px', marginTop:1 }}>⚡ Live from Chainlink oracle</div>
                      </>
                    ) : (
                      <span style={{ color:'#888' }}>Price quote will appear here</span>
                    )}
                  </div>
                )}
              </div>

              <div className="field">
                <label className="label">Delivery Timeout</label>
                <select className="input" value={f.timeout}
                  onChange={e => setF(p => ({ ...p, timeout: Number(e.target.value) }))} disabled={busy}>
                  {TIMEOUTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
                <span style={{ fontSize:'11px', color:'#888', marginTop:4, display:'block' }}>
                  Countdown starts when buyer purchases
                </span>
              </div>
            </div>

            <div style={{ padding:'14px 18px', border:'var(--b1)', fontSize:'12px', color:'#666', lineHeight:1.65, display:'flex', gap:10 }}>
              <span>ℹ</span>
              <span>
                <strong>How pricing works:</strong> You set the price in NGN. The contract uses
                Chainlink's live ETH/USD oracle + current USD/NGN rate to calculate the exact ETH
                to lock. Buyers pay the same ETH amount you locked in.
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ paddingLeft:40 }}>
            <div style={{ position:'sticky', top:80 }}>
              <div style={{ border:'var(--b1)', background:'var(--white)', boxShadow:'var(--s2)' }}>

                <div style={{ padding:'20px 22px', borderBottom:'var(--b1)', background:'var(--lime)' }}>
                  <div style={{ fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em', color:'#555', marginBottom:4 }}>Asking Price</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', lineHeight:1.1 }}>
                    {f.ngnPrice ? fmtNgn(f.ngnPrice) : '₦0'}
                  </div>
                  {ethWei && (
                    <div style={{ fontSize:'12px', color:'#555', marginTop:4 }}>{fmtEth(ethWei)} · Chainlink live rate</div>
                  )}
                </div>

                <div style={{ padding:'18px 22px', borderBottom:'var(--b1)', display:'flex', flexDirection:'column', gap:12, fontSize:'12px' }}>
                  {[
                    ['Item',     f.title    || '—'],
                    ['Category', f.category || '—'],
                    ['Location', f.location || '—'],
                    ['Timeout',  TIMEOUTS.find(t => t.val === f.timeout)?.label || '—'],
                    ['Oracle',   'Chainlink ETH/USD'],
                    ['Storage',  'IPFS (Pinata)'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <span style={{ color:'#888' }}>{k}</span>
                      <span style={{ fontWeight:500, textAlign:'right' }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding:'18px 22px' }}>
                  <button
                    className="btn btn-black fill"
                    style={{ justifyContent:'center', padding:14 }}
                    onClick={submit} disabled={busy || quoteLoading}
                  >
                    {busy
                      ? <><span className="spin" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} />
                          {step===1 ? 'Uploading…' : 'Confirm in wallet…'}</>
                      : step===3 ? '✓ Listed!'
                      : '→ List Item'
                    }
                  </button>
                  {txHash && (
                    <div style={{ marginTop:10, fontSize:'10px', color:'#888', wordBreak:'break-all' }}>
                      TX: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                        style={{ color:'var(--purple)', textDecoration:'underline' }}>
                        {txHash.slice(0,22)}…
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ padding:'14px 22px', borderTop:'var(--b1)', background:'var(--cream)', fontSize:'11px', color:'#666', lineHeight:1.65 }}>
                  ⚠ Your ETH locks when listed. Released when buyer confirms delivery.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
