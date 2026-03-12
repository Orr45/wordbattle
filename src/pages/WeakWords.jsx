import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords, getWeakWords, loadStats } from '../lib/words'
import QuestionCard from '../components/QuestionCard'
import Results from './Results'

const GAME_DURATION = 10 * 60

export default function WeakWords() {
  const navigate = useNavigate()
  const [allWords] = useState(() => loadWords())
  const [gameWords] = useState(() => {
    const words = loadWords()
    const weak = getWeakWords(words, 20)
    // Need at least some wrong answers to have "weak" words
    const stats = loadStats()
    const hasStats = Object.values(stats).some(s => s.wrong > 0)
    return hasStats ? weak : weak // fallback to top 20 anyway
  })
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [startTime] = useState(Date.now())
  const timerRef = useRef(null)
  const stats = loadStats()
  const hasAnyStats = Object.keys(stats).length > 0

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

  const handleAnswer = useCallback((result) => {
    const newAnswers = [...answers, result]
    setAnswers(newAnswers)
    const next = questionIndex + 1
    if (next >= gameWords.length) {
      clearInterval(timerRef.current)
      setGameOver(true)
    } else {
      setQuestionIndex(next)
    }
  }, [answers, questionIndex, gameWords.length])

  if (!hasAnyStats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-2xl font-bold mb-3 text-yellow-300">אין נתונים עדיין</h2>
        <p className="text-white/60 mb-6 max-w-sm">
          שחק כמה סיבובים במצב יחיד כדי שהאפליקציה תלמד אילו מילים קשות לך.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/solo')} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors">
            שחק יחיד
          </button>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-semibold transition-colors">
            בית
          </button>
        </div>
      </div>
    )
  }

  if (gameOver) {
    const totalScore = answers.reduce((s, a) => s + a.points, 0)
    const correct = answers.filter(a => a.correct).length
    return (
      <Results
        answers={answers}
        gameWords={gameWords}
        totalScore={totalScore}
        correct={correct}
        total={gameWords.length}
        finishTime={(Date.now() - startTime) / 1000}
        onPlayAgain={() => navigate(0)}
        onHome={() => navigate('/')}
      />
    )
  }

  if (!gameWords.length) return null

  return (
    <>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-red-500/20 border border-red-500/40 rounded-full px-4 py-1 text-xs text-red-300 font-semibold">
        📉 מילים חלשות
      </div>
      <QuestionCard
        words={gameWords[questionIndex]}
        allWords={allWords}
        questionIndex={questionIndex}
        totalQuestions={gameWords.length}
        onAnswer={handleAnswer}
        globalRemaining={remaining}
      />
    </>
  )
}
