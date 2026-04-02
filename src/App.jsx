import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import Navbar       from './components/Navbar'
import Home         from './pages/Home'
import Marketplace  from './pages/Marketplace'
import CreateEscrow from './pages/CreateEscrow'
import EscrowDetail from './pages/EscrowDetail'
import MyEscrows    from './pages/MyEscrows'

function NotFound() {
  return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:'7rem',lineHeight:1,opacity:0.12}}>404</div>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'2rem',marginBottom:10}}>PAGE NOT FOUND</h2>
        <Link to="/" className="btn btn-black btn-lg">← Go Home</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <Navbar />
      <Routes>
        <Route path="/"            element={<Home />}         />
        <Route path="/marketplace" element={<Marketplace />}  />
        <Route path="/create"      element={<CreateEscrow />} />
        <Route path="/escrow/:id"  element={<EscrowDetail />} />
        <Route path="/my-escrows"  element={<MyEscrows />}    />
        <Route path="*"            element={<NotFound />}     />
      </Routes>
    </WalletProvider>
  )
}
