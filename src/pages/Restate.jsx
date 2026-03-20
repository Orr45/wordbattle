import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords, pickRandom, calcPoints, recordAnswer } from '../lib/words'
import { getRestatementsForWords } from '../lib/ai'
import Results from './Results'

const GAME_DURATION = 10 * 60

function SpeedTimer({ elapsed }) {
  const color = elapsed <= 3 ? 'text-green-400' : elapsed <= 6 ? 'text-yellow-400' : elapsed <= 10 ? 'text-orange-400' : 'text-white/60'
  return <div className={`text-2xl font-mono font-bold tabular-nums ${color}`}>{elapsed.toFixed(1)}s</div>
}

function GlobalTimer({ remaining }) {
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const urgent = remaining <= 60
  return (
    <div className={`font-mono text-lg font-bold tabular-nums ${urgent ? 'text-red-400 animate-pulse' : 'text-white/60'}`}>
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  )
}

export default function Restate() {
  const navigate = useNavigate()
  const [allWords] = useState(() => loadWords())
  const [gameWords] = useState(() => pickRandom(loadWords(), 20))
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [startTime] = useState(Date.now())
  const [selected, setSelected] = useState(null)
  const [flash, setFlash] = useState(null)
  const [showSolutionCard, setShowSolutionCard] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pendingAnswer, setPendingAnswer] = useState(null)

  const timerRef = useRef(null)
  const qTimerRef = useRef(null)
  const lockedRef = useRef(false)
  const qStartRef = useRef(null)

  // Load AI content on mount
  useEffect(() => {
    if (allWords.length < 4) {
      navigate('/settings')
      return
    }
    getRestatementsForWords(gameWords)
      .then(results => {
        const valid = results.filter(r => r.data !== null)
        if (valid.length === 0) {
          setLoadError(true)
          setLoading(false)
          return
        }
        setContent(valid)
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [])

  // Global game timer
  useEffect(() => {
    if (loading || gameOver) return
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setGameOver(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [loading, gameOver])

  // Per-question setup
  useEffect(() => {
    if (loading || content.length === 0) return
    setSelected(null)
    setFlash(null)
    setShowSolutionCard(false)
    setElapsed(0)
    setPendingAnswer(null)
    lockedRef.current = false
    qStartRef.current = Date.now()

    qTimerRef.current = setInterval(() => {
      setElapsed(parseFloat(((Date.now() - qStartRef.current) / 1000).toFixed(1)))
    }, 100)
    return () => clearInterval(qTimerRef.current)
  }, [questionIndex, loading, content.length])

  function handleSelect(optionIndex) {
    if (lockedRef.current) return
    lockedRef.current = true
    clearInterval(qTimerRef.current)

    const time = (Date.now() - qStartRef.current) / 1000
    const currentItem = content[questionIndex]
    const isCorrect = optionIndex === currentItem.data.correctIndex
    const points = isCorrect ? calcPoints(time) : 0

    setSelected(optionIndex)
    setFlash(isCorrect ? 'correct' : 'wrong')
    recordAnswer(currentItem.word.id, isCorrect)
    setPendingAnswer({ correct: isCorrect, points, elapsed: time, selected: { hebrew: '' }, correct_word: currentItem.word })
    setShowSolutionCard(true)
  }

  function handleNext() {
    if (!pendingAnswer) return
    const newAnswers = [...answers, pendingAnswer]
    setAnswers(newAnswers)
    const next = questionIndex + 1
    if (next >= content.length) {
      clearInterval(timerRef.current)
      setGameOver(true)
    } else {
      setQuestionIndex(next)
    }
  }

  function getOptionClass(index) {
    const base = 'w-full py-4 px-5 rounded-2xl text-left font-medium text-base transition-all duration-150 border-2 leading-snug '
    const currentItem = content[questionIndex]
    if (selected === null) {
      return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-500/60 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
    }
    if (index === currentItem?.data.correctIndex) {
      return base + 'bg-green-500/20 border-green-500 text-green-300'
    }
    if (index === selected) {
      return base + 'bg-red-500/20 border-red-500 text-red-300 animate-shake'
    }
    return base + 'bg-white/3 border-white/5 opacity-40'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl animate-pulse">🔁</div>
        <p className="text-white/70 text-center font-medium">מייצר שאלות ניסוח מחדש...</p>
        <p className="text-white/40 text-sm text-center">זה עשוי לקחת כמה שניות</p>
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse rounded-full w-3/4" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-5xl">⚠️</div>
        <p className="text-white/80 font-semibold">לא ניתן לייצר תוכן</p>
        <p className="text-white/40 text-sm">בדוק את חיבור האינטרנט ואת מפתח ה-API</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate(0)} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-semibold transition-colors">נסה שוב</button>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-semibold transition-colors">בית</button>
        </div>
      </div>
    )
  }

  if (gameOver) {
    const totalScore = answers.reduce((sum, a) => sum + a.points, 0)
    const correct = answers.filter(a => a.correct).length
    return (
      <Results
        answers={answers}
        gameWords={content.map(c => c.word)}
        totalScore={totalScore}
        correct={correct}
        total={answers.length}
        finishTime={(Date.now() - startTime) / 1000}
        onPlayAgain={() => navigate(0)}
        onHome={() => navigate('/')}
      />
    )
  }

  const currentItem = content[questionIndex]
  const progress = (questionIndex / content.length) * 100

  return (
    <div className={`min-h-screen flex flex-col px-4 py-6 ${flash === 'correct' ? 'animate-flash-green' : flash === 'wrong' ? 'animate-flash-red' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
        <div className="text-white/60 text-sm font-medium">{questionIndex + 1} / {content.length}</div>
        <SpeedTimer elapsed={elapsed} />
        <GlobalTimer remaining={remaining} />
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto w-full mb-6">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Mode label */}
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 text-center">ניסוח מחדש — בחר את הניסוח הנכון</p>

        {/* Lead sentence */}
        <div className="bg-white/5 border border-white/15 rounded-2xl p-5 mb-6">
          <p className="text-white text-lg leading-relaxed" dir="ltr">{currentItem.data.sentence}</p>
        </div>

        {/* Speed hint */}
        <div className="flex justify-center gap-4 mb-5 text-xs text-white/30">
          <span className="text-green-400">≤3s +50pts</span>
          <span className="text-yellow-400">≤6s +25pts</span>
          <span className="text-orange-400">≤10s +10pts</span>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentItem.data.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={getOptionClass(i)}
              dir="ltr"
            >
              <span className="text-white/40 text-sm mr-2">({String.fromCharCode(65 + i)})</span>
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Solution Card overlay */}
      {showSolutionCard && currentItem.data && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 px-4 pb-6" dir="rtl">
          <div className="w-full max-w-lg bg-[#1a1a2e] border border-white/20 rounded-3xl p-6 animate-slide-up">
            {/* Result indicator */}
            <div className={`flex items-center gap-2 mb-4 ${pendingAnswer?.correct ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-2xl">{pendingAnswer?.correct ? '✓' : '✗'}</span>
              <span className="font-bold text-lg">{pendingAnswer?.correct ? 'נכון!' : 'לא נכון'}</span>
              {pendingAnswer?.points > 0 && <span className="mr-auto text-yellow-400 font-mono font-bold">+{pendingAnswer.points}</span>}
            </div>

            {/* Show correct option if wrong */}
            {!pendingAnswer?.correct && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-3">
                <p className="text-white/40 text-xs mb-1">הניסוח הנכון</p>
                <p className="text-green-300 text-sm leading-relaxed" dir="ltr">
                  ({String.fromCharCode(65 + currentItem.data.correctIndex)}) {currentItem.data.options[currentItem.data.correctIndex]}
                </p>
              </div>
            )}

            {/* Hebrew translation */}
            <div className="bg-white/5 rounded-xl p-4 mb-3">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">תרגום</p>
              <p className="text-white/90 text-sm leading-relaxed">{currentItem.data.translation_he}</p>
            </div>

            {/* Hebrew explanation */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">הסבר</p>
              <p className="text-white/90 text-sm leading-relaxed">{currentItem.data.explanation_he}</p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-2xl font-bold text-lg transition-all"
            >
              הבא ←
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
