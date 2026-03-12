# WordBattle — Claude Context File

## What is this app?

WordBattle is a Hebrew-English vocabulary quiz app built with React + Vite + TailwindCSS v4 + Supabase.
It has both solo learning modes and real-time multiplayer.
The UI is fully in Hebrew (RTL). The app is deployed on Vercel.

- **Live URL:** https://wordbattle-five.vercel.app
- **GitHub:** https://github.com/Orr45/wordbattle.git
- **Supabase project:** https://mihnmmzlcmdxptcicbec.supabase.co

---

## Tech Stack

- React 18 + Vite
- TailwindCSS v4 (using `@tailwindcss/vite` plugin — NOT the old PostCSS plugin)
- Supabase (postgres + realtime subscriptions)
- react-router-dom v6
- Deployed: Vercel (auto-deploys from GitHub `main` branch)

---

## File Structure

```
src/
  App.jsx               — Router: /, /settings, /solo, /reverse, /weak, /type-it, /flashcard, /match, /multiplayer, /room/:code
  index.css             — Global styles + custom animations (flash-green, flash-red, slide-up, pop-in, shake, animate-pop-in)
  App.css               — Empty (cleared to avoid Vite default style conflicts)

  lib/
    supabase.js         — Supabase client (reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env)
    words.js            — loadWords(), saveWords(), buildOptions(), pickRandom(), recordAnswer(), loadStats(), getWeakWords(), calcPoints()
    rooms.js            — createRoom(), getRoom(), startRoom(), joinRoom(), updatePlayer(), getPlayers(), finishRoom(), rematchRoom(), advanceQuestion()

  components/
    Layout.jsx          — Header with Hebrew nav (בית/מילים), hidden on game routes
    QuestionCard.jsx    — Core multiple-choice quiz UI; supports `reverse` prop (Hebrew→English); calls recordAnswer() for stats

  pages/
    Home.jsx            — Hebrew landing page: 6-mode grid + multiplayer button
    Settings.jsx        — Word management (paste/parse word list, delete words)
    SoloGame.jsx        — 10-min timer, 50 random words, uses QuestionCard
    ReverseGame.jsx     — Same as SoloGame but reverse=true (Hebrew→English)
    WeakWords.jsx       — Filters to 20 hardest words via getWeakWords(), uses QuestionCard
    TypeIt.jsx          — Hebrew text input + virtual keyboard
    Flashcard.jsx       — 3D flip card, ידעתי/עוד לא buttons
    MatchGame.jsx       — 6-pair matching grid
    Results.jsx         — End-of-game score summary with word breakdown
    Multiplayer.jsx     — Host/Join room UI, stores player in localStorage (wb_player)
    Room.jsx            — Full multiplayer room: lobby + mode picker + live scoreboard toggle + game routing
    FirstToAnswer.jsx   — "מי ראשון" multiplayer mode (see below)
    Leaderboard.jsx     — End-of-game sorted leaderboard with rematch button (host only)
```

---

## Supabase Schema

### rooms table
```sql
id TEXT PRIMARY KEY,          -- 6-char room code (e.g. "AB3X7K")
word_list JSONB,              -- array of word objects [{id, english, hebrew}, ...]
status TEXT,                  -- 'lobby' | 'playing' | 'finished'
started_at TIMESTAMPTZ,
game_mode TEXT,               -- 'normal' | 'reverse' | 'first'
current_question INT,         -- index of current question (for 'first' mode)
question_started_at TIMESTAMPTZ  -- when current question started (for timer sync)
```

### players table
```sql
id UUID PRIMARY KEY,
room_id TEXT REFERENCES rooms(id),
nickname TEXT,
score INT DEFAULT 0,
answers JSONB,                -- [{correct, points, correct_word, selected}, ...]
finished_at TIMESTAMPTZ       -- null until player finishes all questions
isHost BOOLEAN                -- stored in localStorage only, NOT in DB
```

RLS is enabled with permissive policies for all operations (anon key access).
Realtime is enabled on both tables.

---

## Multiplayer Game Modes

All modes are selected in the lobby by the host:

| Mode | id | Description |
|------|----|-------------|
| רגיל | `normal` | English → Hebrew, self-paced per player |
| הפוך | `reverse` | Hebrew → English, self-paced per player |
| מי ראשון | `first` | Shared timer (8s/question), host drives question advancement |

---

## "מי ראשון" Mode — How It Works (FirstToAnswer.jsx)

- All players see the same question simultaneously.
- Timer is synced via `room.question_started_at` (set in Supabase by host).
- **Host drives all question advancement** — non-hosts just react to `room.current_question` changing via realtime.
- On answer: player saves score + answers array to Supabase via `updatePlayer()`.
- Advances to next question when **either**:
  1. Timer reaches 0 (host's timer tick detects this), **or**
  2. All players have answered before time runs out (useEffect watches `players` prop — checks `p.answers.length > currentIndex` for every player)
- Uses `useRef` pattern extensively to avoid stale closures inside `setInterval`.

---

## Key Patterns / Gotchas

### Stale closure fix (setInterval + useEffect)
All mutable values used inside `setInterval` are stored in refs and kept in sync via `useEffect`:
```js
const currentIndexRef = useRef(currentIndex)
useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
```

### Word storage
Words are stored in `localStorage` (key: `wb_words`). NOT in Supabase.
When host starts a room, `loadWords()` is called, 50 random words are picked, and stored in `room.word_list` in Supabase.
Other players receive the word list via the room object.

### Player identity
Stored in `localStorage` as `wb_player`: `{ id, nickname, room_id, isHost }`.
`isHost` is local-only — not in the DB.

### TailwindCSS v4
Config is done via `index.css` with `@theme` blocks — no `tailwind.config.js`.
Plugin is `@tailwindcss/vite` in `vite.config.js`.

### Vercel deployment
`vercel.json` has SPA rewrite rules (all routes → index.html).
`.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
Env vars are also set in Vercel dashboard under project settings.

---

## Scoring

- Solo modes: `calcPoints(isCorrect, timeLeft, totalTime)` — time-based bonus
- "מי ראשון" mode: +200 correct, -50 wrong (flat, no time bonus)
- Scores are floored at 0 (can't go negative in displayed score)

---

## What Was Built / Session History

1. Full app scaffold (React + Vite + Tailwind + Supabase + routing)
2. Supabase setup + SQL migration
3. GitHub + Vercel deployment
4. Hebrew translation of home page
5. Solo learning modes: Reverse, Type It, Flashcard, Match Game, Weak Words
6. Multiplayer mode selection (normal/reverse/first) in lobby
7. Multiplayer features: Rematch, Live Scoreboard, "מי ראשון" mode
8. Fixed "מי ראשון": timer sync, stale closure bugs, scores saved to leaderboard
9. Fixed "מי ראשון": advance immediately when all players answered (no waiting for timer)

---

## Potential Next Features

- Sound effects on correct/wrong answer
- Streak bonus (consecutive correct answers)
- Kick players / host transfer
- Spectator mode
- Per-word stats screen in solo modes
- Custom word set selection in lobby
- Room password / private rooms
- Mobile PWA support
