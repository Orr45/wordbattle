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
