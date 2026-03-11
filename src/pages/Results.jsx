function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Results({ answers, gameWords, totalScore, correct, total, finishTime, onPlayAgain, onHome }) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">
          {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '⭐' : '💪'}
        </div>
        <h1 className="text-3xl font-bold mb-1">
          {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good Job!' : 'Keep Practicing!'}
        </h1>
        <p className="text-white/50">{formatTime(finishTime)} finish time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <div className="text-3xl font-bold text-yellow-400">{totalScore.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">Total Score</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <div className="text-3xl font-bold text-green-400">{correct}/{total}</div>
          <div className="text-xs text-white/40 mt-1">Correct</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
          <div className="text-3xl font-bold text-purple-400">{accuracy}%</div>
          <div className="text-xs text-white/40 mt-1">Accuracy</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={onHome}
          className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-semibold transition-colors"
        >
          Home
        </button>
      </div>

      {/* Word-by-word breakdown */}
      {answers.length > 0 && (
        <div>
          <h2 className="font-semibold text-white/70 mb-3 text-sm uppercase tracking-wider">Word Breakdown</h2>
          <div className="space-y-1">
            {answers.map((answer, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                  answer.correct ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span>{answer.correct ? '✓' : '✗'}</span>
                  <span className="text-white/80 font-medium">{answer.correct_word.english}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!answer.correct && (
                    <span className="text-red-400 line-through" style={{ fontFamily: 'serif' }}>
                      {answer.selected?.hebrew}
                    </span>
                  )}
                  <span className={`font-semibold ${answer.correct ? 'text-green-300' : 'text-white/50'}`} style={{ fontFamily: 'serif' }}>
                    {answer.correct_word.hebrew}
                  </span>
                  <span className={`text-xs font-mono w-14 text-right ${answer.points > 100 ? 'text-yellow-400' : answer.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {answer.points > 0 ? `+${answer.points}` : '0'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
