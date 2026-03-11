import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { loadWords, pickRandom } from '../lib/words'
import { getRoom, getPlayers, startRoom, updatePlayer, finishRoom } from '../lib/rooms'
import QuestionCard from '../components/QuestionCard'
import Leaderboard from './Leaderboard'

const GAME_DURATION = 10 * 60

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [me, setMe] = useState(null)
  const [gameWords, setGameWords] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const scoreRef = useRef(0)

  // Load player info from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('wb_player')
    if (!stored) { navigate('/multiplayer'); return }
    setMe(JSON.parse(stored))
  }, [])

  // Load room + players
  useEffect(() => {
    if (!me) return
    async function load() {
      try {
        const r = await getRoom(code)
        setRoom(r)
        const p = await getPlayers(code)
        setPlayers(p)

        if (r.status === 'playing') {
          const words = r.word_list
          setGameWords(words)
          const elapsed = (Date.now() - new Date(r.started_at).getTime()) / 1000
          setRemaining(Math.max(0, GAME_DURATION - Math.floor(elapsed)))
        } else if (r.status === 'finished') {
          setGameOver(true)
        }
      } catch (e) {
        setError('Room not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [me, code])

  // Realtime subscriptions
  useEffect(() => {
    if (!me) return

    const roomSub = supabase
      .channel(`room:${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${code}` }, (payload) => {
        const r = payload.new
        setRoom(r)
        if (r.status === 'playing' && gameWords.length === 0) {
          setGameWords(r.word_list)
          const elapsed = (Date.now() - new Date(r.started_at).getTime()) / 1000
          setRemaining(Math.max(0, GAME_DURATION - Math.floor(elapsed)))
        }
        if (r.status === 'finished') {
          clearInterval(timerRef.current)
          setGameOver(true)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${code}` }, async () => {
        const p = await getPlayers(code)
        setPlayers(p)
      })
      .subscribe()

    return () => { supabase.removeChannel(roomSub) }
  }, [me, code, gameWords.length])

  // Start timer when game begins
  useEffect(() => {
    if (!room || room.status !== 'playing' || gameWords.length === 0) return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.status, gameWords.length])

  async function handleTimeUp() {
    if (me?.isHost) {
      await finishRoom(code)
    }
    setGameOver(true)
  }

  async function handleStart() {
    const words = loadWords()
    if (words.length < 4) return
    const selected = pickRandom(words, 50)
    await startRoom(code, selected)
  }

  const handleAnswer = useCallback(async (result) => {
    const newAnswers = [...answers, result]
    setAnswers(newAnswers)
    scoreRef.current += result.points

    const nextIndex = questionIndex + 1
    const finished = nextIndex >= gameWords.length

    await updatePlayer(me.id, {
      score: scoreRef.current,
      answers: newAnswers,
      finished_at: finished ? new Date().toISOString() : null,
    })

    if (finished) {
      clearInterval(timerRef.current)
      setGameOver(true)
    } else {
      setQuestionIndex(nextIndex)
    }
  }, [answers, questionIndex, gameWords.length, me])

  const shareUrl = `${window.location.origin}/room/${code}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Loading room...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-red-400 text-xl">{error}</div>
        <button onClick={() => navigate('/multiplayer')} className="px-6 py-2 bg-white/10 rounded-xl">Back</button>
      </div>
    )
  }

  if (gameOver) {
    return <Leaderboard players={players} myId={me?.id} onHome={() => navigate('/')} roomCode={code} />
  }

  // Lobby
  if (!room || room.status === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏠</div>
            <h1 className="text-2xl font-bold mb-1">Room <span className="text-pink-400 font-mono">{code}</span></h1>
            <p className="text-white/50 text-sm">Waiting for players...</p>
          </div>

          {/* Share link */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Share this link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white/70 outline-none"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-center text-2xl font-mono font-bold text-pink-400 mt-3">{code}</p>
          </div>

          {/* Players */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Players ({players.length})</p>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-lg">{['🥇', '🥈', '🥉', '👤'][Math.min(i, 3)]}</span>
                  <span className={`font-medium ${p.id === me?.id ? 'text-purple-300' : 'text-white/80'}`}>
                    {p.nickname} {p.id === me?.id && <span className="text-xs text-white/40">(you)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {me?.isHost ? (
            <button
              onClick={handleStart}
              disabled={players.length < 1}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 disabled:opacity-40 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
            >
              Start Game ▶
            </button>
          ) : (
            <div className="text-center text-white/40 text-sm py-4">
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    )
  }

  // Game
  if (room.status === 'playing' && gameWords.length > 0) {
    // Player already finished
    if (answers.length >= gameWords.length) {
      return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-2xl font-bold text-green-300">You finished!</h2>
          <p className="text-white/50">Waiting for other players...</p>
          <div className="mt-6 space-y-2 w-full max-w-sm">
            {players.map(p => (
              <div key={p.id} className="flex justify-between bg-white/5 rounded-xl px-4 py-2 text-sm">
                <span>{p.nickname}</span>
                <span className={p.finished_at ? 'text-green-400' : 'text-white/40'}>
                  {p.finished_at ? `✓ ${p.score}pts` : '...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <QuestionCard
        words={gameWords[questionIndex]}
        allWords={gameWords}
        questionIndex={questionIndex}
        totalQuestions={gameWords.length}
        onAnswer={handleAnswer}
        globalRemaining={remaining}
      />
    )
  }

  return null
}
