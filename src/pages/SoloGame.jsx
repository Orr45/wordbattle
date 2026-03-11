import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords, pickRandom } from '../lib/words'
import QuestionCard from '../components/QuestionCard'
import Results from './Results'

const GAME_DURATION = 10 * 60 // 10 minutes in seconds

export default function SoloGame() {
  const navigate = useNavigate()
  const [allWords] = useState(() => loadWords())
  const [gameWords] = useState(() => pickRandom(loadWords(), 50))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [remaining, setRemaining] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [startTime] = useState(Date.now())
  const timerRef = useRef(null)

  useEffect(() => {
    if (allWords.length < 4) {
      navigate('/settings')
      return
    }

    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [])

  const handleAnswer = useCallback((result) => {
    const newAnswers = [...answers, result]
    setAnswers(newAnswers)

    const nextIndex = questionIndex + 1
    if (nextIndex >= gameWords.length) {
      clearInterval(timerRef.current)
      setGameOver(true)
    } else {
      setQuestionIndex(nextIndex)
    }
  }, [answers, questionIndex, gameWords.length])

  if (gameOver) {
    const totalScore = answers.reduce((sum, a) => sum + a.points, 0)
    const correct = answers.filter(a => a.correct).length
    const finishTime = (Date.now() - startTime) / 1000
    return (
      <Results
        answers={answers}
        gameWords={gameWords}
        totalScore={totalScore}
        correct={correct}
        total={gameWords.length}
        finishTime={finishTime}
        onPlayAgain={() => {
          navigate(0) // reload
        }}
        onHome={() => navigate('/')}
      />
    )
  }

  if (!gameWords.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        Not enough words. <button onClick={() => navigate('/settings')} className="underline ml-1">Add words</button>
      </div>
    )
  }

  return (
    <QuestionCard
      words={gameWords[questionIndex]}
      allWords={allWords}
      questionIndex={questionIndex}
      totalQuestions={gameWords.length}
      onAnswer={handleAnswer}
      globalRemaining={remaining}
    />
  )
}
