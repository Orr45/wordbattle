import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Settings from './pages/Settings'
import SoloGame from './pages/SoloGame'
import Multiplayer from './pages/Multiplayer'
import Room from './pages/Room'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/solo" element={<SoloGame />} />
          <Route path="/multiplayer" element={<Multiplayer />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
