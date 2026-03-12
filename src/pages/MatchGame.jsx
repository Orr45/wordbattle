import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords, pickRandom } from '../lib/words'

const STATS_KEY = 'wordbattle_stats'
const PAIRS_COUNT = 6

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

function buildCards(pairs) {
  const cards = []
  pairs.forEach((word, i) => {
    cards.push({ uid: `e-${i}`, pairId: word.id, type: 'english', text: word.english })
    cards.push({ uid: `h-${i}`, pairId: word.id, type: 'hebrew', text: word.hebrew })
  })
  return cards.sort(() => Math.random() - 0.5)
}

export default function MatchGame() {
  const navigate = useNavigate()
  const allWords = useRef(loadWords())

  const [cards] = useState(() => {
    const pairs = pickRandom(allWords.current, PAIRS_COUNT)
    return buildCards(pairs)
  })

  const [flipped, setFlipped] = useState(new Set())      // uids that are face-up
  const [matched, setMatched] = useState(new Set())      // pairIds that are matched
  const [wrongUids, setWrongUids] = useState(new Set())  // brief red flash
  const [selected, setSelected] = useState([])           // up to 2 selected card uids
  const [locked, setLocked] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)
  const startTime = useRef(Date.now())

  const totalPairs = PAIRS_COUNT
  const matchedCount = matched.size

  useEffect(() => {
    if (allWords.current.length < 8) return
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleCardClick = useCallback((uid) => {
    if (locked) return
    const card = cards.find(c => c.uid === uid)
    if (!card) return
    if (matched.has(card.pairId)) return
    if (flipped.has(uid)) return

    const newFlipped = new Set(flipped)
    newFlipped.add(uid)
    const newSelected = [...selected, uid]

    setFlipped(newFlipped)
    setSelected(newSelected)

    if (newSelected.length === 2) {
      setLocked(true)
      const [uid1, uid2] = newSelected
      const card1 = cards.find(c => c.uid === uid1)
      const card2 = cards.find(c => c.uid === uid2)
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (card1.pairId === card2.pairId && card1.type !== card2.type) {
        // Match!
        recordAnswer(card1.pairId, true)
        const newMatched = new Set(matched)
        newMatched.add(card1.pairId)
        setMatched(newMatched)
        setSelected([])
        setLocked(false)
        if (newMatched.size === totalPairs) {
          clearInterval(timerRef.current)
          setDone(true)
        }
      } else {
        // No match
        recordAnswer(card1.pairId, false)
        setWrongUids(new Set([uid1, uid2]))
        setTimeout(() => {
          const revert = new Set(newFlipped)
          revert.delete(uid1)
          revert.delete(uid2)
          setFlipped(revert)
          setSelected([])
          setWrongUids(new Set())
          setLocked(false)
        }, 1000)
      }
    }
  }, [locked, cards, matched, flipped, selected, attempts, totalPairs])

  if (allWords.current.length < 8) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" dir="rtl">
        <p className="text-white/70 text-xl mb-4">צריך לפחות 8 מילים כדי לשחק במשחק ההתאמה</p>
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
    const finalTime = elapsedSeconds
    const score = Math.max(0, 1000 - (attempts - totalPairs) * 50 - Math.floor(finalTime * 2))
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center animate-slide-up" dir="rtl">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-3xl font-bold mb-6">כל הכבוד!</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 w-full max-w-xs space-y-3">
          <div className="flex justify-between text-white/70">
            <span>זמן</span>
            <span className="font-semibold text-white">{formatTime(finalTime)}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>ניסיונות</span>
            <span className="font-semibold text-white">{attempts}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between">
            <span className="text-white/70">ניקוד</span>
            <span className="font-bold text-2xl text-yellow-400">{score}</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate(0)}
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

  return (
    <div className="min-h-screen flex flex-col px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="text-white/50 hover:text-white transition-colors text-2xl leading-none"
          aria-label="חזור"
        >
          ←
        </button>
        <span className="text-white/50 text-sm">{formatTime(elapsedSeconds)}</span>
        <div className="flex-1" />
        <span className="text-white/70 text-sm">
          {matchedCount} / {totalPairs} זוגות
        </span>
        <span className="text-white/40 text-sm">• {attempts} ניסיונות</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${(matchedCount / totalPairs) * 100}%` }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-lg mx-auto">
        {cards.map(card => {
          const isFlipped = flipped.has(card.uid)
          const isMatched = matched.has(card.pairId)
          const isWrong = wrongUids.has(card.uid)
          const isEnglish = card.type === 'english'

          let bgClass = 'bg-slate-800/80 border-slate-600/40'
          if (isMatched) {
            bgClass = 'bg-green-700/80 border-green-500/50'
          } else if (isWrong) {
            bgClass = 'bg-red-700/80 border-red-500/50 animate-shake'
          } else if (isFlipped && isEnglish) {
            bgClass = 'bg-purple-800/90 border-purple-500/50'
          } else if (isFlipped && !isEnglish) {
            bgClass = 'bg-pink-900/90 border-pink-500/50'
          }

          return (
            <button
              key={card.uid}
              onClick={() => handleCardClick(card.uid)}
              disabled={isMatched || (isFlipped && !wrongUids.has(card.uid) && selected.length === 2)}
              className={`
                aspect-square rounded-xl border flex items-center justify-center p-1
                transition-all duration-200 cursor-pointer
                hover:scale-105 active:scale-95
                disabled:cursor-default disabled:hover:scale-100
                ${bgClass}
              `}
              style={{
                transform: isFlipped || isMatched ? 'rotateY(0deg)' : undefined,
              }}
            >
              {isFlipped || isMatched ? (
                <span
                  className={`text-center leading-tight font-semibold ${
                    card.text.length > 10 ? 'text-xs' : card.text.length > 6 ? 'text-sm' : 'text-base'
                  }`}
                  style={!isEnglish ? { fontFamily: 'serif', direction: 'rtl' } : undefined}
                >
                  {card.text}
                </span>
              ) : (
                <span className="text-white/30 text-2xl font-bold">?</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-center text-white/20 text-xs mt-6">מצא את כל {totalPairs} הזוגות</p>
    </div>
  )
}
