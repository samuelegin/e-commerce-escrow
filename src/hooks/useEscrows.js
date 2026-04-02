import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../context/WalletContext'
import { fetchIPFS } from '../utils/ipfs'
import { lsSet, lsGet } from '../utils/helpers'

const BLOCKS = 10000
const MAX    = 50

function parse(raw) {
  return {
    id:          Number(raw.id),
    seller:      raw.seller,
    buyer:       raw.buyer,
    ngnPrice:    raw.ngnPrice ? Number(raw.ngnPrice) : null,
    // ✅ Store as string — BigInt is silently lost by JSON.stringify (localStorage)
    amount:      raw.amount != null ? raw.amount.toString() : '0',
    cid:         raw.cid,
    status:      Number(raw.status),
    createdAt:   raw.createdAt,
    depositedAt: raw.depositedAt,
    timeout:     raw.timeoutDuration,
  }
}

async function enrich(e) {
  if (!e.cid || e.cid === '') return { ...e, meta: null }
  try { return { ...e, meta: await fetchIPFS(e.cid) } }
  catch { return { ...e, meta: null } }
}

export function useEscrows() {
  const { readContract, contract } = useWallet()
  const c = contract || readContract
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (!c) return
    setLoading(true); setError(null)
    const cached = lsGet('escrows_v2')
    if (cached) setList(cached)
    try {
      const provider = c.runner?.provider || c.provider
      const latest   = await provider.getBlockNumber()
      const from     = Math.max(0, latest - BLOCKS)
      const evts     = await c.queryFilter(c.filters.EscrowCreated(), from, 'latest')
      const recent   = evts.slice(-MAX)
      const rows     = await Promise.all(
        recent.map(async ev => {
          try {
            const raw = await c.getEscrow(Number(ev.args.escrowId))
            return await enrich(parse(raw))
          } catch { return null }
        })
      )
      const clean = rows.filter(Boolean).reverse()
      setList(clean)
      lsSet('escrows_v2', clean)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [c])

  useEffect(() => {
    if (!c) return
    const refresh = async (escrowId) => {
      try {
        const raw = await c.getEscrow(Number(escrowId))
        const e   = await enrich(parse(raw))
        setList(prev => {
          const idx = prev.findIndex(x => x.id === e.id)
          if (idx === -1) return [e, ...prev].slice(0, MAX)
          const next = [...prev]; next[idx] = e; return next
        })
        lsSet('escrows_v2', null)
      } catch {}
    }
    c.on('EscrowCreated',     (id) => refresh(id))
    c.on('DepositMade',       (id) => refresh(id))
    c.on('DeliveryConfirmed', (id) => refresh(id))
    c.on('FundsReleased',     (id) => refresh(id))
    c.on('RefundIssued',      (id) => refresh(id))
    c.on('EscrowCancelled',   (id) => refresh(id))
    return () => c.removeAllListeners()
  }, [c])

  useEffect(() => { load() }, [load])

  return { list, loading, error, reload: load }
}

export function useMyEscrows() {
  const { account } = useWallet()
  const { list, loading, error, reload } = useEscrows()
  const mine = list.filter(e =>
    e.seller?.toLowerCase() === account?.toLowerCase() ||
    e.buyer?.toLowerCase()  === account?.toLowerCase()
  )
  return { list: mine, loading, error, reload }
}

export function useEscrow(id) {
  const { readContract } = useWallet()
  const c = readContract
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (!c || id == null) return
    setLoading(true); setError(null)
    try {
      const raw = await c.getEscrow(id)
      setData(await enrich(parse(raw)))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [c, id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!c) return
    const refresh = (eid) => { if (Number(eid) === Number(id)) load() }
    c.on('DepositMade',       refresh)
    c.on('DeliveryConfirmed', refresh)
    c.on('FundsReleased',     refresh)
    c.on('RefundIssued',      refresh)
    c.on('EscrowCancelled',   refresh)
    return () => c.removeAllListeners()
  }, [c, id, load])

  return { data, loading, error, reload: load }
}
