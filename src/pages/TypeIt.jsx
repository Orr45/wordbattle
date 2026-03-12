import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords, pickRandom, recordAnswer, calcPoints } from '../lib/words'

const GAME_DURATION = 10 * 60
const HEBREW_ROWS = [
  ['ק','ר','א','ט','ו','ן','ם','פ'],
  ['ש','ד','ג','כ','ע','י','ח','ל','ך','ף'],
  ['ז','ס','ב','ה','נ','מ','צ','ת','ץ'],
]

function HebrewKeyboard({ onKey, onBackspace }) {
  return (
    <div className="space-y-2 mt-4" dir="rtl">
      {HEBREW_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1">
          {row.map(k => (
            <button
              key={k}
              onMouseDown={e => { e.preventDefault(); onKey(k) }}
              className="w-9 h-10 bg-white/10 hover:bg-white/20 active:bg-purple-600 rounded-lg text-sm font-semibold transition-colors"
            >
              {k}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2">
        <button
          onMouseDown={e => { e.preventDefault(); onKey(' ') }}
          className="px-12 h-10 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white/50 transition-colors"
        >
          רווח
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onBackspace() }}
          className="px-4 h-10 bg-white/10 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}

function normalize(str) {
  return str.trim().toLowerCase()
}

export default function TypeIt() {
  const navigate = useNavigate()
  const [allWords] = useState(() => loadWords())
  const [gameWords] = useState(() => pickRandom(loadWords(), 50))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState(null) // 'correct' | 'wrong'
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const startTime = useRef(Date.now())
  const timerRef = useRef(null)
  const lockedRef = useRef(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (allWords.length < 4) { navigate('/settings'); return }
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setGameOver(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    setInput('')
    setStatus(null)
    lockedRef.current = false
    startTime.current = Date.now()
    inputRef.current?.focus()
  }, [questionIndex])

  const currentWord = gameWords[questionIndex]

  function handleSubmit() {
    if (lockedRef.current || !input.trim()) return
    lockedRef.current = true

    const time = (Date.now() - startTime.current) / 1000
    const correct = normalize(input) === normalize(currentWord.hebrew)
    const points = correct ? calcPoints(time) : 0

    recordAnswer(currentWord.id, correct)
    setStatus(correct ? 'correct' : 'wrong')
    setScore(s => s + points)
    setAnswers(prev => [...prev, { correct, points, input: input.trim(), correct_word: currentWord }])

    setTimeout(() => {
      const next = questionIndex + 1
      if (next >= gameWords.length) {
        clearInterval(timerRef.current)
        setGameOver(true)
      } else {
        setQuestionIndex(next)
      }
    }, correct ? 700 : 1800)
  }

  function handleKey(k) {
    if (lockedRef.current) return
    setInput(prev => prev + k)
  }

  function handleBackspace() {
    if (lockedRef.current) return
    setInput(prev => prev.slice(0, -1))
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const progress = (questionIndex / gameWords.length) * 100
  const correct = answers.filter(a => a.correct).length

  if (gameOver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="text-6xl mb-4">{correct / gameWords.length >= 0.7 ? '🏆' : '💪'}</div>
        <h1 className="text-3xl font-bold mb-2">סיימת!</h1>
        <p className="text-white/50 mb-6">{correct} / {answers.length} נכון · {score.toLocaleString()} נקודות</p>
        <div className="space-y-2 w-full max-w-sm mb-8 max-h-64 overflow-y-auto">
          {answers.map((a, i) => (
            <div key={i} className={`flex justify-between rounded-xl px-4 py-2 text-sm ${a.correct ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <span>{a.correct_word.english}</span>
              <span style={{ fontFamily: 'serif' }}>{a.correct ? a.input : <><span className="line-through text-red-400 mr-2">{a.input}</span>{a.correct_word.hebrew}</>}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={() => navigate(0)} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors">שחק שוב</button>
          <button onClick={() => navigate('/')} className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-semibold transition-colors">בית</button>
        </div>
      </div>
    )
  }

  if (!gameWords.length) return null

  return (
    <div className={`min-h-screen flex flex-col px-4 py-6 ${status === 'correct' ? 'animate-flash-green' : status === 'wrong' ? 'animate-flash-red' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 max-w-lg mx-auto w-full">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-sm">← בית</button>
        <span className="text-white/60 text-sm">{questionIndex + 1} / {gameWords.length}</span>
        <span className={`font-mono font-bold ${remaining <= 60 ? 'text-red-400' : 'text-white/60'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto w-full mb-6">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        <div className="text-center mb-8">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-3">כתוב בעברית</p>
          <h2 className="text-4xl font-bold text-white">{currentWord.english}</h2>
        </div>

        {/* Input display */}
        <div
          className={`w-full py-4 px-5 rounded-2xl text-center text-2xl font-bold border-2 mb-2 min-h-[64px] transition-colors ${
            status === 'correct' ? 'border-green-500 text-green-300 bg-green-500/10' :
            status === 'wrong' ? 'border-red-500 text-red-300 bg-red-500/10' :
            'border-purple-500/50 bg-white/5'
          }`}
          style={{ fontFamily: 'serif', direction: 'rtl' }}
        >
          {input || <span className="text-white/20">הקלד כאן...</span>}
        </div>

        {status === 'wrong' && (
          <p className="text-center text-green-300 text-sm mb-2 animate-slide-up" style={{ fontFamily: 'serif' }}>
            התשובה: {currentWord.hebrew}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!!status || !input.trim()}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-bold transition-colors mb-2"
        >
          בדוק ↵
        </button>

        {/* Hidden native input for keyboard */}
        <input
          ref={inputRef}
          value={input}
          onChange={e => !lockedRef.current && setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="opacity-0 h-0 absolute"
          dir="rtl"
        />

        <HebrewKeyboard onKey={handleKey} onBackspace={handleBackspace} />
      </div>
    </div>
  )
}
