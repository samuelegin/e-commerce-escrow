const JWT     = import.meta.env.VITE_PINATA_JWT
const API     = 'https://api.pinata.cloud'
const GATEWAY = 'https://gateway.pinata.cloud/ipfs'

export function ipfsUrl(cid) {
  return cid ? `${GATEWAY}/${cid}` : null
}

export async function uploadFile(file) {
  if (!JWT) throw new Error('VITE_PINATA_JWT not set in .env')
  const fd = new FormData()
  fd.append('file', file)
  fd.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))
  const res = await fetch(`${API}/pinning/pinFileToIPFS`, {
    method: 'POST', headers: { Authorization: `Bearer ${JWT}` }, body: fd,
  })
  if (!res.ok) throw new Error('IPFS file upload failed')
  return (await res.json()).IpfsHash
}

export async function uploadJSON(obj) {
  if (!JWT) throw new Error('VITE_PINATA_JWT not set in .env')
  const res = await fetch(`${API}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JWT}` },
    body: JSON.stringify({ pinataContent: obj, pinataOptions: { cidVersion: 1 } }),
  })
  if (!res.ok) throw new Error('IPFS JSON upload failed')
  return (await res.json()).IpfsHash
}

export async function fetchIPFS(cid) {
  const res = await fetch(`${GATEWAY}/${cid}`)
  if (!res.ok) throw new Error('IPFS fetch failed')
  return res.json()
}

// Full item upload: image → IPFS, then metadata JSON → IPFS
export async function uploadItem({ title, description, category, location, price, imageFile }) {
  let imageCid = null
  if (imageFile) imageCid = await uploadFile(imageFile)
  const metaCid = await uploadJSON({
    title, description, category, location, price,
    imageCid, imageUrl: ipfsUrl(imageCid),
    createdAt: new Date().toISOString(),
  })
  return metaCid
}
