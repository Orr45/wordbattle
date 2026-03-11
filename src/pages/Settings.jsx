import { useState, useEffect } from 'react'
import { loadWords, saveWords, parseWords, addWords, deleteWord } from '../lib/words'

export default function Settings() {
  const [words, setWords] = useState([])
  const [text, setText] = useState('')
  const [preview, setPreview] = useState([])
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    setWords(loadWords())
  }, [])

  useEffect(() => {
    if (text.trim()) {
      setPreview(parseWords(text))
    } else {
      setPreview([])
    }
  }, [text])

  function handleAdd() {
    if (!preview.length) return
    const merged = addWords(preview)
    setWords(merged)
    setText('')
    setPreview([])
    setFeedback({ type: 'success', msg: `Added ${preview.length} word(s)` })
    setTimeout(() => setFeedback(null), 2500)
  }

  function handleDelete(id) {
    const updated = deleteWord(id)
    setWords(updated)
  }

  function handleClearAll() {
    if (!confirm('Delete ALL words? This cannot be undone.')) return
    saveWords([])
    setWords([])
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 text-purple-300">Word Settings</h1>
      <p className="text-white/50 text-sm mb-6">Paste words in the format: <code className="bg-white/10 px-1 rounded">apple - תפוח</code></p>

      {feedback && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium animate-slide-up ${
          feedback.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'apple - תפוח\nbeautiful - יפה\nbook - ספר'}
          className="w-full h-40 bg-transparent outline-none resize-none text-white placeholder:text-white/30 text-sm font-mono"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
          <span className="text-white/40 text-xs">
            {preview.length > 0 ? `${preview.length} word(s) parsed` : 'Paste words above'}
          </span>
          <button
            onClick={handleAdd}
            disabled={!preview.length}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors"
          >
            Add Words
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="mb-6 bg-white/5 border border-purple-500/30 rounded-2xl p-4">
          <p className="text-xs text-purple-400 font-semibold mb-3">PREVIEW</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {preview.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1">
                <span className="text-white/80">{w.english}</span>
                <span className="text-purple-300 font-semibold" style={{ fontFamily: 'serif', direction: 'rtl' }}>{w.hebrew}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-white/80">
          Your Words <span className="text-white/40 text-sm ml-1">({words.length})</span>
        </h2>
        {words.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
          >
            Clear All
          </button>
        )}
      </div>

      {words.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
          No words yet. Paste some above to get started.
        </div>
      ) : (
        <div className="space-y-1">
          {words.map(word => (
            <div
              key={word.id}
              className="flex items-center justify-between bg-white/5 hover:bg-white/8 rounded-xl px-4 py-3 group transition-colors"
            >
              <span className="text-white/80 text-sm">{word.english}</span>
              <div className="flex items-center gap-3">
                <span className="text-purple-300 text-sm font-semibold" style={{ fontFamily: 'serif' }}>{word.hebrew}</span>
                <button
                  onClick={() => handleDelete(word.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all text-xs px-2 py-0.5 rounded hover:bg-red-500/20"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {words.length > 0 && words.length < 4 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-xs text-center">
          Add {4 - words.length} more word{4 - words.length !== 1 ? 's' : ''} to start playing
        </div>
      )}
    </div>
  )
}
