import { useState, useEffect, useRef } from 'react'
import { buildOptions } from '../lib/words'
import { advanceQuestion, finishRoom } from '../lib/rooms'

const QUESTION_TIME = 8 // seconds per question

export default function FirstToAnswer({ gameWords, room, me, players, onGameOver }) {
  const currentIndex = room.current_question ?? 0
  const currentWord = gameWords[currentIndex]
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [scores, setScores] = useState({}) // local score accumulation
  const timerRef = useRef(null)
  const advancedRef = useRef(false)
  const prevIndexRef = useRef(currentIndex)

  // Rebuild options when question changes
  useEffect(() => {
    if (!currentWord) return
    setOptions(buildOptions(gameWords, currentWord))
    setSelected(null)
    advancedRef.current = false
  }, [currentIndex])

  // Sync timeLeft from question_started_at
  useEffect(() => {
    if (!room.question_started_at) return
    clearInterval(timerRef.current)

    const tick = () => {
      const elapsed = (Date.now() - new Date(room.question_started_at).getTime()) / 1000
      const left = Math.max(0, QUESTION_TIME - elapsed)
      setTimeLeft(parseFloat(left.toFixed(1)))
      if (left <= 0 && !advancedRef.current && me.isHost) {
        advancedRef.current = true
        handleAdvance()
      }
    }
    tick()
    timerRef.current = setInterval(tick, 100)
    return () => clearInterval(timerRef.current)
  }, [room.question_started_at, currentIndex])

  async function handleAdvance() {
    clearInterval(timerRef.current)
    const next = currentIndex + 1
    if (next >= gameWords.length) {
      await finishRoom(room.id)
      onGameOver(scores)
    } else {
      await advanceQuestion(room.id, next)
    }
  }

  function handleSelect(option) {
    if (selected) return
    const isCorrect = option.id === currentWord.id
    const pts = isCorrect ? 200 : -50
    setSelected({ option, correct: isCorrect })
    setScores(prev => ({ ...prev, [me.id]: (prev[me.id] || 0) + pts }))
  }

  function getOptionClass(option) {
    const base = 'w-full py-4 px-5 rounded-2xl font-semibold text-lg transition-all duration-150 border-2 text-right '
    if (!selected) return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/60 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
    if (option.id === currentWord.id) return base + 'bg-green-500/20 border-green-500 text-green-300'
    if (selected.option.id === option.id) return base + 'bg-red-500/20 border-red-500 text-red-300'
    return base + 'bg-white/5 border-white/5 opacity-30'
  }

  const timerPct = (timeLeft / QUESTION_TIME) * 100
  const timerColor = timeLeft > 4 ? 'bg-green-500' : timeLeft > 2 ? 'bg-yellow-500' : 'bg-red-500'

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  if (!currentWord) return null

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 max-w-lg mx-auto w-full">
        <div className="text-white/60 text-sm">{currentIndex + 1} / {gameWords.length}</div>
        <div className={`text-2xl font-mono font-bold tabular-nums ${timeLeft <= 2 ? 'text-red-400 animate-pulse' : timeLeft <= 4 ? 'text-yellow-400' : 'text-green-400'}`}>
          {timeLeft.toFixed(1)}s
        </div>
        <div className="text-white/40 text-xs">⚡ מי ראשון</div>
      </div>

      {/* Timer bar */}
      <div className="max-w-lg mx-auto w-full mb-4">
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${timerColor} rounded-full transition-all duration-100`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </div>

      {/* Mini live scoreboard */}
      <div className="max-w-lg mx-auto w-full mb-4 flex gap-2 overflow-x-auto pb-1">
        {sortedPlayers.map((p, i) => (
          <div key={p.id} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${p.id === me.id ? 'bg-purple-600/30 border border-purple-500/50' : 'bg-white/5 border border-white/10'}`}>
            <span>{['🥇','🥈','🥉'][i] ?? `#${i+1}`}</span>
            <span className="max-w-16 truncate">{p.nickname}</span>
            <span className="text-yellow-400">{p.score}</span>
          </div>
        ))}
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">תרגם לעברית — מי ראשון!</p>
          <h2 className="text-4xl font-bold text-white">{currentWord.english}</h2>
        </div>

        {selected && (
          <div className={`text-center mb-4 text-lg font-bold animate-pop-in ${selected.correct ? 'text-green-400' : 'text-red-400'}`}>
            {selected.correct ? '+200 נקודות! 🔥' : '-50 נקודות 😬'}
          </div>
        )}

        <div className="space-y-3">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleSelect(option)}
              className={getOptionClass(option)}
              style={{ fontFamily: 'serif', direction: 'rtl' }}
            >
              {option.hebrew}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
