import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { loadWords, pickRandom } from '../lib/words'
import { getRoom, getPlayers, startRoom, updatePlayer, finishRoom } from '../lib/rooms'
import QuestionCard from '../components/QuestionCard'
import FirstToAnswer from './FirstToAnswer'
import Leaderboard from './Leaderboard'

const GAME_DURATION = 10 * 60

const MODES = [
  { id: 'normal',  icon: '🧠', label: 'רגיל',      sub: 'אנגלית → עברית' },
  { id: 'reverse', icon: '🔄', label: 'הפוך',       sub: 'עברית → אנגלית' },
  { id: 'first',   icon: '⚡', label: 'מי ראשון',   sub: '8 שניות לשאלה' },
]

function LiveScoreboard({ players, myId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur border border-white/10 rounded-2xl p-3 min-w-36 animate-slide-up" dir="rtl">
      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">ניקוד חי</p>
      <div className="space-y-1.5">
        {sorted.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between gap-3 text-sm ${p.id === myId ? 'text-purple-300 font-bold' : 'text-white/70'}`}>
            <span className="flex items-center gap-1">
              <span>{['🥇','🥈','🥉'][i] ?? `${i+1}.`}</span>
              <span className="max-w-24 truncate">{p.nickname}</span>
            </span>
            <span className="text-yellow-400 font-mono text-xs">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [me, setMe] = useState(null)
  const [gameWords, setGameWords] = useState([])
  const [selectedMode, setSelectedMode] = useState('normal')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const scoreRef = useRef(0)

  useEffect(() => {
    const stored = localStorage.getItem('wb_player')
    if (!stored) { navigate('/multiplayer'); return }
    setMe(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (!me) return
    async function load() {
      try {
        const r = await getRoom(code)
        setRoom(r)
        const p = await getPlayers(code)
        setPlayers(p)
        if (r.status === 'playing') {
          setGameWords(r.word_list)
          const elapsed = (Date.now() - new Date(r.started_at).getTime()) / 1000
          setRemaining(Math.max(0, GAME_DURATION - Math.floor(elapsed)))
        } else if (r.status === 'finished') {
          setGameOver(true)
        }
      } catch { setError('החדר לא נמצא') }
      finally { setLoading(false) }
    }
    load()
  }, [me, code])

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
        if (r.status === 'lobby') {
          // Rematch happened
          setGameWords([])
          setAnswers([])
          setQuestionIndex(0)
          setGameOver(false)
          scoreRef.current = 0
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

  // Global timer (not used for 'first' mode)
  useEffect(() => {
    if (!room || room.status !== 'playing' || gameWords.length === 0 || room.game_mode === 'first') return
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleTimeUp(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [room?.status, gameWords.length, room?.game_mode])

  async function handleTimeUp() {
    if (me?.isHost) await finishRoom(code)
    setGameOver(true)
  }

  async function handleStart() {
    const words = loadWords()
    if (words.length < 4) return
    const selected = pickRandom(words, 50)
    await startRoom(code, selected, selectedMode)
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
    if (finished) { clearInterval(timerRef.current); setGameOver(true) }
    else setQuestionIndex(nextIndex)
  }, [answers, questionIndex, gameWords.length, me])

  const shareUrl = `${window.location.origin}/room/${code}`
  const gameMode = room?.game_mode || 'normal'
  const isReverse = gameMode === 'reverse'
  const isFirstMode = gameMode === 'first'

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/50">טוען חדר...</div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <div className="text-red-400 text-xl">{error}</div>
      <button onClick={() => navigate('/multiplayer')} className="px-6 py-2 bg-white/10 rounded-xl">חזור</button>
    </div>
  )
  if (gameOver) return (
    <Leaderboard
      players={players}
      myId={me?.id}
      isHost={me?.isHost}
      roomCode={code}
      onHome={() => navigate('/')}
      onRematch={() => {
        setGameOver(false)
        setAnswers([])
        setQuestionIndex(0)
        scoreRef.current = 0
        setGameWords([])
      }}
    />
  )

  // Lobby
  if (!room || room.status === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏠</div>
            <h1 className="text-2xl font-bold mb-1">חדר <span className="text-pink-400 font-mono">{code}</span></h1>
            <p className="text-white/50 text-sm">ממתין לשחקנים...</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">שתף קישור</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white/70 outline-none" dir="ltr" />
              <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm transition-colors">העתק</button>
            </div>
            <p className="text-center text-2xl font-mono font-bold text-pink-400 mt-3">{code}</p>
          </div>

          {me?.isHost && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">בחר מצב משחק</p>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id)}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${selectedMode === m.id ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-xs font-bold">{m.label}</span>
                    <span className="text-xs text-white/40 text-center leading-tight">{m.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!me?.isHost && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-4 text-center text-white/50 text-sm">
              המארח יבחר את מצב המשחק
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">שחקנים ({players.length})</p>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-lg">{['🥇','🥈','🥉','👤'][Math.min(i, 3)]}</span>
                  <span className={`font-medium ${p.id === me?.id ? 'text-purple-300' : 'text-white/80'}`}>
                    {p.nickname} {p.id === me?.id && <span className="text-xs text-white/40">(את/ה)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {me?.isHost ? (
            <button onClick={handleStart} disabled={players.length < 1} className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 disabled:opacity-40 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95">
              התחל {MODES.find(m => m.id === selectedMode)?.icon} {MODES.find(m => m.id === selectedMode)?.label} ▶
            </button>
          ) : (
            <div className="text-center text-white/40 text-sm py-4">ממתין למארח להתחיל...</div>
          )}
        </div>
      </div>
    )
  }

  // Game — First To Answer mode
  if (room.status === 'playing' && gameWords.length > 0 && isFirstMode) {
    return (
      <>
        {showScoreboard && <LiveScoreboard players={players} myId={me?.id} />}
        <button
          onClick={() => setShowScoreboard(s => !s)}
          className="fixed top-4 right-4 z-50 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
        >
          {showScoreboard ? 'הסתר ניקוד' : '📊 ניקוד'}
        </button>
        <FirstToAnswer
          gameWords={gameWords}
          room={room}
          me={me}
          players={players}
          onGameOver={() => setGameOver(true)}
        />
      </>
    )
  }

  // Game — Normal / Reverse mode
  if (room.status === 'playing' && gameWords.length > 0) {
    if (answers.length >= gameWords.length) {
      return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-4" dir="rtl">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-2xl font-bold text-green-300">סיימת!</h2>
          <p className="text-white/50">ממתין לשאר השחקנים...</p>
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
      <>
        {showScoreboard && <LiveScoreboard players={players} myId={me?.id} />}
        <button
          onClick={() => setShowScoreboard(s => !s)}
          className="fixed top-4 right-4 z-50 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
        >
          {showScoreboard ? 'הסתר ניקוד' : '📊 ניקוד'}
        </button>
        <QuestionCard
          words={gameWords[questionIndex]}
          allWords={gameWords}
          questionIndex={questionIndex}
          totalQuestions={gameWords.length}
          onAnswer={handleAnswer}
          globalRemaining={remaining}
          reverse={isReverse}
        />
      </>
    )
  }

  return null
}
