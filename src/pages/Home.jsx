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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" dir="rtl">
      <div className="text-center mb-12 animate-slide-up">
        <div className="text-7xl mb-4">⚔️</div>
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          WordBattle
        </h1>
        <p className="text-white/60 text-lg">שלוט באוצר המילים באנגלית דרך קרב</p>
      </div>

      <div className="w-full max-w-sm space-y-4 animate-slide-up">
        {!canPlay && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 text-center text-yellow-300 text-sm">
            הוסף לפחות 4 מילים כדי להתחיל לשחק ←{' '}
            <button onClick={() => navigate('/settings')} className="underline font-semibold">
              הגדרות
            </button>
          </div>
        )}

        <button
          onClick={() => canPlay && navigate('/solo')}
          disabled={!canPlay}
          className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
            canPlay
              ? 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/50'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <span className="text-2xl">🧠</span>
          משחק יחיד
          {wordCount > 0 && <span className="text-sm font-normal opacity-70">({wordCount} מילים)</span>}
        </button>

        <button
          onClick={() => canPlay && supabaseOk && navigate('/multiplayer')}
          disabled={!canPlay || !supabaseOk}
          className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${
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
          ⚙️ ניהול מילים
        </button>
      </div>

      {wordCount > 0 && (
        <p className="mt-8 text-white/30 text-sm">
          {wordCount} מילים מוכנות
        </p>
      )}
    </div>
  )
}
