import Anthropic from '@anthropic-ai/sdk'

const SENTENCES_KEY = 'wordbattle_sentences'
const RESTATEMENTS_KEY = 'wordbattle_restatements'

// ── Cache I/O ──────────────────────────────────────────────────────

export function loadSentenceCache() {
  try { return JSON.parse(localStorage.getItem(SENTENCES_KEY)) || {} }
  catch { return {} }
}
export function saveSentenceCache(cache) {
  localStorage.setItem(SENTENCES_KEY, JSON.stringify(cache))
}
export function loadRestatementCache() {
  try { return JSON.parse(localStorage.getItem(RESTATEMENTS_KEY)) || {} }
  catch { return {} }
}
export function saveRestatementCache(cache) {
  localStorage.setItem(RESTATEMENTS_KEY, JSON.stringify(cache))
}

// ── Client ────────────────────────────────────────────────────────

function getClient() {
  return new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })
}

const SYSTEM_PROMPT = `You are an expert English Philologist specializing in the 2025 Israeli Psychometric Entrance Test (PET).
Your task is to generate high-level academic content (CEFR B2-C1) for Hebrew speakers.

Guidelines:
- Vocabulary: Use modern academic English (Nature/Economist level). Avoid archaic words; focus on nuanced, context-dependent words.
- Distractors for Restatements: Use traps typical of the 2025 exam — reverse cause-and-effect, change intensity (certainly→likely), similar-sounding words with different meanings.
- Return strictly valid JSON. No markdown fences. No explanation outside JSON.`

// ── Sentence Completion generation ────────────────────────────────

async function generateSentencesBatch(words) {
  const client = getClient()
  const prompt = `For each English vocabulary word below, write one English sentence containing ___ where the word belongs.

Rules:
- B2-C1 academic level, 2025 PET/Amiram exam style
- The blank clearly requires this specific word in context (not just any synonym)
- Exactly one ___ per sentence, no other blanks
- Complete, grammatically correct sentence
- Include Hebrew translation of the full sentence (with the word filled in)
- Include a brief Hebrew explanation of why this word fits (e.g., mention contrast words, register, context clues)

Return ONLY a JSON array, no markdown fences, no other text.
Schema: [{"word_id":"<id>","sentence":"The committee ___ its initial findings after peer review.","options":["<correct english word>","<distractor2>","<distractor3>","<distractor4>"],"correctIndex":0,"translation_he":"הוועדה סקרה מחדש את ממצאיה הראשוניים לאחר ביקורת עמיתים.","explanation_he":"המילה 'revised' מתאימה בגלל..."}]

Note: For sentence completion, options[correctIndex] must be the exact English word. The other 3 options should be plausible distractors (different English words from a similar register) — I will override them from the app's word list, so just put placeholder words.

Words:
${words.map(w => `- word_id: "${w.id}", english: "${w.english}", hebrew: "${w.hebrew}"`).join('\n')}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].text.trim()
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(cleaned)
}

// ── Restatements generation ───────────────────────────────────────

async function generateRestatementsBatch(words) {
  const client = getClient()
  const prompt = `For each English vocabulary word below, write a restatement question in 2025 PET/Amiram exam style.

Rules:
- Write a sentence that uses the vocabulary word naturally (include the actual word — no blank)
- Provide exactly 4 options: full English sentences, each rephrasing or interpreting the original sentence
- The correct option truly captures the sentence's meaning (especially the word's contribution)
- The 3 wrong options must be plausible traps: reverse cause-and-effect, change intensity (certainly→likely), use similar-sounding words, or shift scope (specific→general)
- Vary correctIndex across questions (don't always use 0 or 1)
- B2-C1 academic level
- Include Hebrew translation of the lead sentence
- Include a brief Hebrew explanation of why the correct option is right and the others are wrong

Return ONLY a JSON array, no markdown fences, no other text.
Schema: [{"word_id":"<id>","sentence":"The researcher's tenacious pursuit of data eventually yielded groundbreaking results.","options":["The researcher abandoned his pursuit when results were slow to emerge.","The researcher's persistent dedication to gathering data ultimately led to a major discovery.","The researcher relied on others to collect data on his behalf.","The researcher achieved results quickly due to his efficient methods."],"correctIndex":1,"translation_he":"המחקר התמיד של החוקר בעקבות הנתונים הניב בסופו של דבר תוצאות פורצות דרך.","explanation_he":"האפשרות הנכונה (ב) לוכדת את המשמעות של 'tenacious' — התמדה — ואת הקשר הסיבתי. אפשרות א' הפוכה, ג' משנה את מיהו הפועל, ד' מוסיפה מידע שלא קיים במשפט."}]

Words:
${words.map(w => `- word_id: "${w.id}", english: "${w.english}", hebrew: "${w.hebrew}"`).join('\n')}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 5000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].text.trim()
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(cleaned)
}

// ── Batched runner ────────────────────────────────────────────────

const BATCH_SIZE = 20

async function runBatched(words, generateFn) {
  const batches = []
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    batches.push(words.slice(i, i + BATCH_SIZE))
  }
  const settled = await Promise.allSettled(batches.map(b => generateFn(b)))
  const results = []
  for (const s of settled) {
    if (s.status === 'fulfilled') results.push(...s.value)
    else console.warn('AI batch failed:', s.reason)
  }
  return results
}

// ── Public API ────────────────────────────────────────────────────

export async function getSentencesForWords(words) {
  const cache = loadSentenceCache()
  const missing = words.filter(w => !cache[w.id])

  if (missing.length > 0) {
    try {
      const generated = await runBatched(missing, generateSentencesBatch)
      for (const item of generated) {
        cache[item.word_id] = {
          sentence: item.sentence,
          translation_he: item.translation_he,
          explanation_he: item.explanation_he,
        }
      }
      saveSentenceCache(cache)
    } catch (err) {
      console.warn('Sentence generation failed:', err)
    }
  }

  return words.map(w => ({ word: w, data: cache[w.id] || null }))
}

export async function getRestatementsForWords(words) {
  const cache = loadRestatementCache()
  const missing = words.filter(w => !cache[w.id])

  if (missing.length > 0) {
    try {
      const generated = await runBatched(missing, generateRestatementsBatch)
      for (const item of generated) {
        cache[item.word_id] = {
          sentence: item.sentence,
          options: item.options,
          correctIndex: item.correctIndex,
          translation_he: item.translation_he,
          explanation_he: item.explanation_he,
        }
      }
      saveRestatementCache(cache)
    } catch (err) {
      console.warn('Restatement generation failed:', err)
    }
  }

  return words.map(w => ({ word: w, data: cache[w.id] || null }))
}
