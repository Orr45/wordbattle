const STORAGE_KEY = 'wordbattle_words'

export function parseWords(text) {
  const lines = text.split('\n')
  const words = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const dashIdx = trimmed.indexOf(' - ')
    if (dashIdx === -1) continue
    const english = trimmed.slice(0, dashIdx).trim()
    const hebrew = trimmed.slice(dashIdx + 3).trim()
    if (english && hebrew) {
      words.push({ english, hebrew, id: `${english}_${hebrew}` })
    }
  }
  return words
}

export function loadWords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
}

export function addWords(newWords) {
  const existing = loadWords()
  const existingIds = new Set(existing.map(w => w.id))
  const toAdd = newWords.filter(w => !existingIds.has(w.id))
  const merged = [...existing, ...toAdd]
  saveWords(merged)
  return merged
}

export function deleteWord(id) {
  const words = loadWords().filter(w => w.id !== id)
  saveWords(words)
  return words
}

export function pickRandom(words, count) {
  const shuffled = [...words].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function getDistractors(words, correctWord, count = 3) {
  const others = words.filter(w => w.id !== correctWord.id)
  const shuffled = others.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function buildOptions(words, correctWord) {
  const distractors = getDistractors(words, correctWord, 3)
  const options = [correctWord, ...distractors].sort(() => Math.random() - 0.5)
  return options
}

export function calcPoints(timeSeconds) {
  if (timeSeconds <= 3) return 150
  if (timeSeconds <= 6) return 125
  if (timeSeconds <= 10) return 110
  return 100
}

const STATS_KEY = 'wordbattle_stats'

export function loadStats() {
  try {
    const data = localStorage.getItem(STATS_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function recordAnswer(wordId, correct) {
  const stats = loadStats()
  if (!stats[wordId]) stats[wordId] = { correct: 0, wrong: 0 }
  if (correct) stats[wordId].correct++
  else stats[wordId].wrong++
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function getWeakWords(words, count = 20) {
  const stats = loadStats()
  const scored = words.map(w => {
    const s = stats[w.id] || { correct: 0, wrong: 0 }
    const total = s.correct + s.wrong
    const wrongRate = total === 0 ? 0 : s.wrong / total
    return { ...w, wrongRate, total }
  })
  // Sort by wrong rate desc, then by total attempts desc (most practiced wrong first)
  scored.sort((a, b) => b.wrongRate - a.wrongRate || b.total - a.total)
  return scored.slice(0, count)
}
