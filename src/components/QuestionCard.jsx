import { useState, useEffect, useRef } from 'react'
import { buildOptions, calcPoints } from '../lib/words'

const TOTAL_TIME = 10 * 60 // 10 minutes

function SpeedTimer({ elapsed }) {
  const color = elapsed <= 3 ? 'text-green-400' : elapsed <= 6 ? 'text-yellow-400' : elapsed <= 10 ? 'text-orange-400' : 'text-white/60'
  return (
    <div className={`text-2xl font-mono font-bold tabular-nums ${color}`}>
      {elapsed.toFixed(1)}s
    </div>
  )
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

export default function QuestionCard({ words, allWords, questionIndex, totalQuestions, onAnswer, globalRemaining }) {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [flash, setFlash] = useState(null) // 'correct' | 'wrong'
  const [elapsed, setElapsed] = useState(0)
  const [showCorrect, setShowCorrect] = useState(false)
  const startTime = useRef(Date.now())
  const timerRef = useRef(null)
  const lockedRef = useRef(false)

  useEffect(() => {
    setOptions(buildOptions(allWords, words))
    setSelected(null)
    setFlash(null)
    setShowCorrect(false)
    setElapsed(0)
    lockedRef.current = false
    startTime.current = Date.now()

    timerRef.current = setInterval(() => {
      setElapsed(parseFloat(((Date.now() - startTime.current) / 1000).toFixed(1)))
    }, 100)

    return () => clearInterval(timerRef.current)
  }, [words, allWords])

  function handleSelect(option) {
    if (lockedRef.current) return
    lockedRef.current = true
    clearInterval(timerRef.current)

    const time = (Date.now() - startTime.current) / 1000
    const isCorrect = option.id === words.id
    const points = isCorrect ? calcPoints(time) : 0

    setSelected(option.id)
    setFlash(isCorrect ? 'correct' : 'wrong')

    if (!isCorrect) {
      setShowCorrect(true)
      setTimeout(() => {
        onAnswer({ correct: false, points: 0, elapsed: time, selected: option, correct_word: words })
      }, 1500)
    } else {
      setTimeout(() => {
        onAnswer({ correct: true, points, elapsed: time, selected: option, correct_word: words })
      }, 600)
    }
  }

  function getOptionClass(option) {
    const base = 'w-full py-4 px-5 rounded-2xl text-right font-semibold text-lg transition-all duration-150 border-2 '
    const isSelected = selected === option.id
    const isCorrectOpt = option.id === words.id

    if (!selected) {
      return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/60 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
    }
    if (isCorrectOpt) {
      return base + 'bg-green-500/20 border-green-500 text-green-300'
    }
    if (isSelected && !isCorrectOpt) {
      return base + 'bg-red-500/20 border-red-500 text-red-300 animate-shake'
    }
    return base + 'bg-white/3 border-white/5 opacity-40'
  }

  const progress = ((questionIndex) / totalQuestions) * 100

  return (
    <div className={`min-h-screen flex flex-col px-4 py-6 ${flash === 'correct' ? 'animate-flash-green' : flash === 'wrong' ? 'animate-flash-red' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
        <div className="text-white/60 text-sm font-medium">
          {questionIndex + 1} / {totalQuestions}
        </div>
        <SpeedTimer elapsed={elapsed} />
        <GlobalTimer remaining={globalRemaining} />
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto w-full mb-8">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-3">Translate to Hebrew</p>
          <h2 className="text-4xl font-bold text-white">{words.english}</h2>
        </div>

        {/* Speed hint */}
        <div className="flex justify-center gap-4 mb-6 text-xs text-white/30">
          <span className="text-green-400">≤3s +50pts</span>
          <span className="text-yellow-400">≤6s +25pts</span>
          <span className="text-orange-400">≤10s +10pts</span>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => (
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

        {showCorrect && (
          <div className="mt-4 text-center animate-slide-up">
            <p className="text-white/50 text-sm">Correct answer:</p>
            <p className="text-green-300 text-xl font-bold mt-1" style={{ fontFamily: 'serif' }}>
              {words.hebrew}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
