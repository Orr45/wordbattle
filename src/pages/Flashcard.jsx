import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords } from '../lib/words'

const STATS_KEY = 'wordbattle_stats'

function recordAnswer(wordId, correct) {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    const stats = raw ? JSON.parse(raw) : {}
    if (!stats[wordId]) stats[wordId] = { correct: 0, wrong: 0 }
    if (correct) {
      stats[wordId].correct += 1
    } else {
      stats[wordId].wrong += 1
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // ignore
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Flashcard() {
  const navigate = useNavigate()
  const allWords = useRef(loadWords())
  const [queue, setQueue] = useState(() => [...allWords.current])
  const [flipped, setFlipped] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [done, setDone] = useState(false)
  const [startTime] = useState(Date.now())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef(null)

  const total = allWords.current.length
  const current = queue[0]

  useEffect(() => {
    if (total < 4) return
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  if (total < 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" dir="rtl">
        <p className="text-white/70 text-xl mb-4">צריך לפחות 4 מילים כדי לשחק</p>
        <button
          onClick={() => navigate('/settings')}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all"
        >
          הוסף מילים בהגדרות
        </button>
      </div>
    )
  }

  if (done) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center animate-slide-up" dir="rtl">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold mb-2">כל הכבוד!</h2>
        <p className="text-white/60 mb-1">סיימת את כל {total} המילים</p>
        <p className="text-white/50 text-sm mb-8">זמן: {formatTime(elapsed)}</p>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setQueue([...allWords.current])
              setKnownCount(0)
              setFlipped(false)
              setDone(false)
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
          >
            שחק שוב
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-white/30 hover:border-white/60 rounded-xl font-semibold text-white/70 hover:text-white transition-all"
          >
            בית
          </button>
        </div>
      </div>
    )
  }

  const handleKnew = () => {
    recordAnswer(current.id, true)
    const newQueue = queue.slice(1)
    const newKnown = knownCount + 1
    setKnownCount(newKnown)
    setFlipped(false)
    if (newQueue.length === 0) {
      clearInterval(timerRef.current)
      setDone(true)
    } else {
      setQueue(newQueue)
    }
  }

  const handleDidntKnow = () => {
    recordAnswer(current.id, false)
    const newQueue = [...queue.slice(1), current]
    setQueue(newQueue)
    setFlipped(false)
  }

  const progress = total > 0 ? (knownCount / total) * 100 : 0

  return (
    <div className="min-h-screen flex flex-col px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-white/50 hover:text-white transition-colors text-2xl leading-none"
          aria-label="חזור"
        >
          ←
        </button>
        <span className="text-white/50 text-sm">{formatTime(elapsedSeconds)}</span>
        <div className="flex-1" />
        <span className="text-white/70 font-semibold text-sm">{knownCount} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className="w-full max-w-sm cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => !flipped && setFlipped(true)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '260px',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
              className="bg-purple-900/80 border border-purple-500/30 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-purple-900/50 p-8"
            >
              <p className="text-white/40 text-xs mb-4 uppercase tracking-widest">אנגלית</p>
              <p className="text-white text-4xl font-bold text-center">{current?.english}</p>
              <p className="text-white/30 text-sm mt-6">לחץ לגלות</p>
            </div>

            {/* Back */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="bg-pink-900/80 border border-pink-500/30 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-pink-900/50 p-8"
            >
              <p className="text-white/40 text-xs mb-4 tracking-widest">עברית</p>
              <p
                className="text-white text-4xl font-bold text-center"
                style={{ fontFamily: 'serif', direction: 'rtl' }}
              >
                {current?.hebrew}
              </p>
            </div>
          </div>
        </div>

        {/* Flip button (shown when not flipped) */}
        {!flipped && (
          <button
            onClick={() => setFlipped(true)}
            className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl font-semibold transition-all animate-slide-up"
          >
            הפוך
          </button>
        )}

        {/* Answer buttons (shown after flip) */}
        {flipped && (
          <div className="mt-8 flex gap-4 w-full max-w-sm animate-slide-up">
            <button
              onClick={handleDidntKnow}
              className="flex-1 py-4 bg-red-600/80 hover:bg-red-500 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
            >
              ✗ עוד לא
            </button>
            <button
              onClick={handleKnew}
              className="flex-1 py-4 bg-green-600/80 hover:bg-green-500 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
            >
              ✓ ידעתי
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-white/30 text-xs mt-6">
        נותרו בתור: {queue.length}
      </div>
    </div>
  )
}
