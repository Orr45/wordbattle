import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords, pickRandom } from '../lib/words'
import { createRoom, joinRoom } from '../lib/rooms'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Multiplayer() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null) // 'host' | 'join'
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold mb-3 text-yellow-300">Supabase Not Configured</h2>
          <p className="text-white/60 text-sm mb-4">
            To use multiplayer, create a <code className="bg-white/10 px-1 rounded">.env</code> file in the project root with:
          </p>
          <pre className="bg-white/5 rounded-xl p-4 text-left text-xs text-green-300 mb-6">
{`VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
          </pre>
          <p className="text-white/40 text-xs mb-6">
            Then run the SQL migrations from the README to create the rooms and players tables.
          </p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 hover:bg-white/15 rounded-xl font-semibold transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  async function handleHost() {
    if (!nickname.trim()) return
    setLoading(true)
    setError(null)
    try {
      const words = loadWords()
      if (words.length < 4) { setError('Need at least 4 words'); setLoading(false); return }
      const room = await createRoom([])
      const player = await joinRoom(room.id, nickname.trim())
      localStorage.setItem('wb_player', JSON.stringify({ id: player.id, nickname: player.nickname, isHost: true }))
      navigate(`/room/${room.id}`)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!nickname.trim() || !roomCode.trim()) return
    setLoading(true)
    setError(null)
    try {
      const player = await joinRoom(roomCode.trim().toUpperCase(), nickname.trim())
      localStorage.setItem('wb_player', JSON.stringify({ id: player.id, nickname: player.nickname, isHost: false }))
      navigate(`/room/${roomCode.trim().toUpperCase()}`)
    } catch (e) {
      setError(e.message || 'Room not found')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-pink-400">⚔️ Multiplayer</h1>
      <p className="text-white/50 text-sm mb-8">Battle friends in real-time</p>

      {!mode && (
        <div className="w-full max-w-sm space-y-3 animate-slide-up">
          <button
            onClick={() => setMode('host')}
            className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
          >
            🏠 Host a Room
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
          >
            🚪 Join a Room
          </button>
          <button onClick={() => navigate('/')} className="w-full py-2 text-white/40 hover:text-white/60 text-sm transition-colors">
            ← Back
          </button>
        </div>
      )}

      {mode && (
        <div className="w-full max-w-sm animate-slide-up">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-lg">{mode === 'host' ? '🏠 Host a Room' : '🚪 Join a Room'}</h2>

            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider block mb-1">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                maxLength={20}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                onKeyDown={e => e.key === 'Enter' && (mode === 'host' ? handleHost() : handleJoin())}
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider block mb-1">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  maxLength={6}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors font-mono tracking-widest text-center text-lg"
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              onClick={mode === 'host' ? handleHost : handleJoin}
              disabled={loading || !nickname.trim() || (mode === 'join' && !roomCode.trim())}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
            >
              {loading ? 'Loading...' : mode === 'host' ? 'Create Room' : 'Join Room'}
            </button>

            <button onClick={() => setMode(null)} className="w-full text-white/40 hover:text-white/60 text-sm transition-colors py-1">
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
