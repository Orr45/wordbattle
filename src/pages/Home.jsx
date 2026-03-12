import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadWords } from '../lib/words'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [wordCount, setWordCount] = useState(0)
  const [supabaseOk] = useState(isSupabaseConfigured)

  useEffect(() => {
    setWordCount(loadWords().length)
  }, [])

  const canPlay = wordCount >= 4

  const modes = [
    { icon: '🧠', label: 'משחק יחיד', sub: 'בחר מ-4 אפשרויות', path: '/solo', color: 'from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 shadow-purple-900/50' },
    { icon: '🔄', label: 'מצב הפוך', sub: 'עברית → אנגלית', path: '/reverse', color: 'from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 shadow-indigo-900/50' },
    { icon: '✍️', label: 'הקלד את זה', sub: 'כתוב בעצמך', path: '/type-it', color: 'from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 shadow-cyan-900/50' },
    { icon: '🃏', label: 'כרטיסיות', sub: 'הפוך וזכור', path: '/flashcard', color: 'from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 shadow-teal-900/50' },
    { icon: '🧩', label: 'משחק התאמה', sub: 'מצא את הזוגות', path: '/match', color: 'from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 shadow-orange-900/50' },
    { icon: '📉', label: 'מילים חלשות', sub: 'תרגל את הקשות', path: '/weak', color: 'from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 shadow-red-900/50' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" dir="rtl">
      <div className="text-center mb-8 animate-slide-up">
        <div className="text-6xl mb-3">⚔️</div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          WordBattle
        </h1>
        <p className="text-white/60">שלוט באוצר המילים באנגלית דרך קרב</p>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {!canPlay && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 text-center text-yellow-300 text-sm mb-4">
            הוסף לפחות 4 מילים כדי להתחיל לשחק ←{' '}
            <button onClick={() => navigate('/settings')} className="underline font-semibold">הגדרות</button>
          </div>
        )}

        {/* Main modes grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {modes.map(mode => (
            <button
              key={mode.path}
              onClick={() => canPlay && navigate(mode.path)}
              disabled={!canPlay}
              className={`py-4 px-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all duration-200 ${
                canPlay
                  ? `bg-gradient-to-br ${mode.color} hover:scale-105 active:scale-95 shadow-lg`
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <span className="text-2xl">{mode.icon}</span>
              <span className="text-sm">{mode.label}</span>
              <span className="text-xs font-normal opacity-60">{mode.sub}</span>
            </button>
          ))}
        </div>

        {/* Multiplayer full-width */}
        <button
          onClick={() => canPlay && supabaseOk && navigate('/multiplayer')}
          disabled={!canPlay || !supabaseOk}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 mb-3 ${
            canPlay && supabaseOk
              ? 'bg-gradient-to-r from-pink-600 to-rose-800 hover:from-pink-500 hover:to-rose-700 hover:scale-105 active:scale-95 shadow-lg shadow-rose-900/50'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <span className="text-2xl">⚔️</span>
          מרובה משתתפים
          {!supabaseOk && <span className="text-xs font-normal opacity-50">(נדרש Supabase)</span>}
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="w-full py-3 rounded-2xl font-semibold text-white/70 border border-white/20 hover:border-white/40 hover:text-white transition-all"
        >
          ⚙️ ניהול מילים {wordCount > 0 && <span className="text-white/40 text-sm">({wordCount})</span>}
        </button>
      </div>
    </div>
  )
}
