import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Settings from './pages/Settings'
import SoloGame from './pages/SoloGame'
import ReverseGame from './pages/ReverseGame'
import WeakWords from './pages/WeakWords'
import TypeIt from './pages/TypeIt'
import Flashcard from './pages/Flashcard'
import MatchGame from './pages/MatchGame'
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
          <Route path="/reverse" element={<ReverseGame />} />
          <Route path="/weak" element={<WeakWords />} />
          <Route path="/type-it" element={<TypeIt />} />
          <Route path="/flashcard" element={<Flashcard />} />
          <Route path="/match" element={<MatchGame />} />
          <Route path="/multiplayer" element={<Multiplayer />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
