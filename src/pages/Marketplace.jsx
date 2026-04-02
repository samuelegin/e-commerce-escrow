import React, { useState, useMemo } from 'react'
import { useEscrows } from '../hooks/useEscrows'
import EscrowCard from '../components/EscrowCard'
import { CATEGORIES } from '../utils/helpers'

const STATUS_FILTERS = [
  { label: 'Active Listings', val: 'active' },
  { label: 'Pending',         val: 0        },
  { label: 'Active',          val: 1        },
  { label: 'Completed',       val: 2        },
  { label: 'Refunded',        val: 3        },
  { label: 'Cancelled',       val: 4        },
  { label: 'All',             val: 'all'    },
]

export default function Marketplace() {
  const { list, loading, error, reload } = useEscrows()

  const [statusFilter, setStatusFilter] = useState('active')
  const [category,     setCategory]     = useState('')
  const [search,       setSearch]       = useState('')

  // Apply all filters + search together
  const shown = useMemo(() => {
    let result = list

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(e => e.status === 0 || e.status === 1)
    } else if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter)
    }

    // Category filter
    if (category) {
      result = result.filter(e =>
        e.meta?.category?.toLowerCase() === category.toLowerCase()
      )
    }

    // Search — matches title, description, location, category
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(e => {
        const title    = (e.meta?.title       || '').toLowerCase()
        const desc     = (e.meta?.description || '').toLowerCase()
        const loc      = (e.meta?.location    || '').toLowerCase()
        const cat      = (e.meta?.category    || '').toLowerCase()
        const seller   = (e.seller            || '').toLowerCase()
        return title.includes(q) || desc.includes(q) ||
               loc.includes(q)   || cat.includes(q)  ||
               seller.includes(q)
      })
    }

    return result
  }, [list, statusFilter, category, search])

  const hasFilters = search.trim() || category

  return (
    <div className="page marketplace-page">

      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ borderBottom: 'var(--b2)' }}>
        <div className="wrap marketplace-header" style={{ paddingTop: 36, paddingBottom: 0 }}>

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888', marginBottom: 6 }}>
                Decentralised · No Server · Ethereum
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem,5vw,4rem)', lineHeight: 1 }}>
                MARKETPLACE
              </h1>
            </div>
            <button className="btn" onClick={reload} style={{ marginBottom: 4 }}>
              ↻ Refresh
            </button>
          </div>

          {/* ── Search bar ─────────────────────────────────── */}
          <div className="marketplace-searchbar" style={{
            display: 'flex', border: 'var(--b2)',
            background: 'var(--white)', boxShadow: 'var(--s2)',
            marginBottom: 0,
          }}>
            {/* Search icon + input */}
            <div style={{
              display: 'flex', alignItems: 'center', flex: 1,
              borderRight: 'var(--b1)',
            }}>
              <span style={{
                padding: '0 16px',
                fontSize: '18px', color: '#aaa',
                lineHeight: 1,
              }}>⌕</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search items, descriptions, locations…"
                style={{
                  flex: 1, padding: '14px 0', border: 'none',
                  background: 'transparent', outline: 'none',
                  fontFamily: 'var(--font-mono)', fontSize: '13px',
                  color: 'var(--black)',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    padding: '0 16px', background: 'none', border: 'none',
                    color: '#aaa', fontSize: '16px', cursor: 'pointer',
                  }}
                >✕</button>
              )}
            </div>

            {/* Category dropdown */}
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                padding: '14px 16px',
                border: 'none', borderRight: 'var(--b1)',
                background: 'transparent', outline: 'none',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                color: category ? 'var(--black)' : '#888',
                cursor: 'pointer', minWidth: 180,
              }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Result count */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 18px',
              fontSize: '11px', color: '#888',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              borderRight: hasFilters ? 'var(--b1)' : 'none',
            }}>
              {loading && list.length === 0 ? '…' : `${shown.length} results`}
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setCategory('') }}
                style={{
                  padding: '0 16px', background: 'none', border: 'none',
                  fontSize: '11px', color: 'var(--purple)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  letterSpacing: '0.07em', whiteSpace: 'nowrap',
                }}
              >
                Clear ✕
              </button>
            )}
          </div>

          {/* ── Status filter tabs ──────────────────────────── */}
          <div style={{ display: 'flex', marginTop: 12, gap: 0 }}>
            {STATUS_FILTERS.map((f, i) => (
              <button key={f.val} onClick={() => setStatusFilter(f.val)} style={{
                padding: '8px 16px',
                border: 'var(--b1)', borderRight: i < STATUS_FILTERS.length - 1 ? 'none' : 'var(--b1)',
                background: statusFilter === f.val ? 'var(--black)' : 'var(--cream)',
                color:       statusFilter === f.val ? 'var(--white)' : 'var(--black)',
                fontSize: '10px', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                fontFamily: 'var(--font-mono)', cursor: 'pointer',
              }}>
                {f.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────── */}
      <div className="wrap" style={{ paddingTop: 36, paddingBottom: 48 }}>

        {/* Loading */}
        {loading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <span className="spin" style={{ width: 40, height: 40, borderWidth: 4 }} />
              <p style={{ fontSize: '13px', color: '#888' }}>Scanning blockchain events…</p>
              <p style={{ fontSize: '11px', color: '#bbb' }}>Querying last 10,000 blocks</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ border: '2px solid var(--red)', background: '#fff5f5', padding: 20, marginBottom: 28 }}>
            <strong>Error loading escrows:</strong> {error}
            <button className="btn" onClick={reload} style={{ marginLeft: 16 }}>Retry</button>
          </div>
        )}

        {/* No results */}
        {!loading && shown.length === 0 && !error && (
          <div style={{
            border: 'var(--b1)', background: 'var(--white)',
            padding: '80px 0', textAlign: 'center',
            boxShadow: 'var(--s1)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 14, opacity: 0.3 }}>◈</div>
            <h3 style={{ fontFamily: 'var(--font-ui)', marginBottom: 8 }}>
              {hasFilters ? 'No results found' : 'No listings yet'}
            </h3>
            <p style={{ fontSize: '13px', color: '#888' }}>
              {search ? `Nothing matching "${search}"` : category ? `No items in "${category}"` : 'Be the first to list an item!'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setCategory('') }}
                className="btn btn-black"
                style={{ marginTop: 16 }}
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Results grid */}
        {shown.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px,1fr))',
            border: 'var(--b1)',
          }}>
            {shown.map((e, i) => (
              <div key={e.id} style={{
                borderRight: (i + 1) % 4 !== 0 ? 'var(--b1)' : 'none',
                borderBottom: 'var(--b1)',
              }}>
                <EscrowCard escrow={e} />
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <div style={{
          marginTop: 32, padding: '14px 18px',
          border: 'var(--b1)', background: 'var(--white)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
          fontSize: '12px', color: '#666', lineHeight: 1.65,
        }}>
          <span>ℹ</span>
          <span>
            <strong>Fully decentralised:</strong> Showing {list.length} most recent escrows
            from the last 10,000 blocks. No server. Events scanned live via{' '}
            <code style={{ background: '#f5f5f5', padding: '1px 5px' }}>contract.queryFilter()</code>.
          </span>
        </div>

      </div>
    </div>
  )
}
