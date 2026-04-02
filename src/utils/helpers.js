import { ethers } from 'ethers'

export const short = (a, n=4) => a ? `${a.slice(0,n+2)}…${a.slice(-n)}` : ''

export const fmtEth = (wei) => {
  try { return parseFloat(ethers.formatEther(BigInt(wei ?? 0))).toFixed(4) } catch { return '0' }
}

export const fmtDate = (ts) => {
  if (!ts) return '—'
  return new Date(Number(ts)*1000).toLocaleString('en-NG', {
    day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  })
}

export const timeLeft = (depositedAt, duration) => {
  if (!depositedAt || !duration) return null
  const deadline = (Number(depositedAt) + Number(duration)) * 1000
  const diff = deadline - Date.now()
  if (diff <= 0) return { expired: true, text: 'Expired' }
  const d = Math.floor(diff/86400000)
  const h = Math.floor((diff%86400000)/3600000)
  const m = Math.floor((diff%3600000)/60000)
  return { expired: false, text: d>0 ? `${d}d ${h}h left` : `${h}h ${m}m left` }
}

export const isAddr = (a) => { try { ethers.getAddress(a); return true } catch { return false } }
export const copy = async (t) => { try { await navigator.clipboard.writeText(t); return true } catch { return false } }

/**
 * Convert ETH amount to NGN display string.
 * Pass live oracle rates for accuracy; falls back to static estimate.
 *
 * @param {string|number} eth    - ETH amount e.g. "4.9474"
 * @param {number|null}   ethUsd - Live ETH/USD from Chainlink e.g. 2480.50
 * @param {number|null}   usdNgn - Live USD/NGN rate e.g. 1620
 */
export const naira = (eth, ethUsd = null, usdNgn = null) => {
  const ethAmt = parseFloat(eth || 0)
  const ngnAmount = (ethUsd && usdNgn)
    ? ethAmt * ethUsd * usdNgn   // ✅ live Chainlink: ETH → USD → NGN
    : ethAmt * 2500 * 1620       // ⚠ fallback static estimate

  return ngnAmount.toLocaleString('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  })
}

export const CATEGORIES = [
  'Phones & Tablets', 'Laptops & Computers', 'Electronics',
  'Accessories & Gadgets', 'Gaming', 'Cameras & Photography',
  "Men's Fashion", "Women's Fashion", "Kids' Fashion",
  'Shoes & Footwear', 'Watches & Jewellery', 'Bags & Luggage',
  'Home Appliances', 'Furniture & Decor', 'Kitchen & Dining', 'Garden & Outdoors',
  'Cars', 'Motorcycles & Bicycles', 'Vehicle Parts & Accessories',
  'Property for Sale', 'Property for Rent',
  'Health & Beauty', 'Gym & Fitness', 'Baby Products',
  'Food & Groceries', 'Farming & Agriculture',
  'Services', 'Books, Music & Movies', 'Musical Instruments',
  'Sports & Outdoors', 'Art & Collectibles', 'Industrial & Scientific', 'Other',
]

export const TIMEOUTS = [
  { label:'3 Days',  val: 259200  },
  { label:'7 Days',  val: 604800  },
  { label:'14 Days', val: 1209600 },
  { label:'30 Days', val: 2592000 },
]

export const lsSet = (k, v, ttl=300000) => {
  try { localStorage.setItem(k, JSON.stringify({ v, exp: Date.now() + ttl })) } catch {}
}
export const lsGet = (k) => {
  try {
    const x = JSON.parse(localStorage.getItem(k))
    if (!x) return null
    if (Date.now() > x.exp) { localStorage.removeItem(k); return null }
    return x.v
  } catch { return null }
}
