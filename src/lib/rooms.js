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
  const { data, error } = await supabase
    .from('rooms')
    .update({ status: 'playing', word_list: wordList, started_at: new Date().toISOString(), game_mode: gameMode })
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
