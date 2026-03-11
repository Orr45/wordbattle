function formatTime(iso) {
  if (!iso) return '—'
  // This is a relative display — we just show the finish timestamp as readable
  return new Date(iso).toLocaleTimeString()
}

const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard({ players, myId, onHome, roomCode }) {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Tiebreaker: who finished first
    if (a.finished_at && b.finished_at) return new Date(a.finished_at) - new Date(b.finished_at)
    if (a.finished_at) return -1
    if (b.finished_at) return 1
    return 0
  })

  const winner = sorted[0]

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-8 animate-pop-in">
        <div className="text-6xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold mb-1">Game Over!</h1>
        {winner && (
          <p className="text-yellow-400 font-semibold">
            {winner.nickname} wins with {winner.score.toLocaleString()} points!
          </p>
        )}
      </div>

      <div className="space-y-3 mb-8">
        {sorted.map((player, i) => {
          const isMe = player.id === myId
          const answers = player.answers || []
          const correct = answers.filter(a => a.correct).length
          const total = answers.length

          return (
            <div
              key={player.id}
              className={`flex items-center gap-4 rounded-2xl px-5 py-4 border transition-all animate-slide-up ${
                isMe
                  ? 'bg-purple-600/20 border-purple-500/50'
                  : i === 0
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-2xl w-8 text-center">
                {medals[i] ?? `#${i + 1}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {player.nickname}
                  {isMe && <span className="text-xs text-purple-400 font-normal">(you)</span>}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {correct}/{total} correct · {player.finished_at ? '✓ Finished' : '⏱ Time up'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold text-yellow-400">{player.score.toLocaleString()}</div>
                <div className="text-xs text-white/30">pts</div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={onHome}
        className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl font-semibold transition-colors"
      >
        Back to Home
      </button>
    </div>
  )
}
