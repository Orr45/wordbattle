import { supabase } from './supabase'

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createRoom(wordList) {
  const code = genRoomCode()
  const { data, error } = await supabase
    .from('rooms')
    .insert({ id: code, word_list: wordList, status: 'lobby', started_at: null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRoom(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', code)
    .single()
  if (error) throw error
  return data
}

export async function startRoom(code, wordList, gameMode = 'normal') {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('rooms')
    .update({
      status: 'playing',
      word_list: wordList,
      started_at: now,
      game_mode: gameMode,
      current_question: 0,
      question_started_at: now,
    })
    .eq('id', code)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function joinRoom(code, nickname) {
  const playerId = crypto.randomUUID()
  const { data, error } = await supabase
    .from('players')
    .insert({ id: playerId, room_id: code, nickname, score: 0, answers: [], finished_at: null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePlayer(playerId, updates) {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPlayers(roomId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
  if (error) throw error
  return data
}

export async function finishRoom(code) {
  await supabase.from('rooms').update({ status: 'finished' }).eq('id', code)
}

export async function rematchRoom(code) {
  await supabase.from('rooms').update({
    status: 'lobby', word_list: [], started_at: null,
    current_question: 0, question_started_at: null,
  }).eq('id', code)
  const { data: players } = await supabase.from('players').select('id').eq('room_id', code)
  for (const p of (players || [])) {
    await supabase.from('players').update({ score: 0, answers: [], finished_at: null }).eq('id', p.id)
  }
}

export async function advanceQuestion(code, nextIndex) {
  await supabase.from('rooms').update({
    current_question: nextIndex,
    question_started_at: new Date().toISOString(),
  }).eq('id', code)
}
