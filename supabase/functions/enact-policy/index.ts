import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const POWER_TABLE: Record<string, Record<number, string>> = {
  '5':  { 3: 'policy_peek', 4: 'special_election', 5: 'execution', 6: 'execution' },
  '6':  { 3: 'policy_peek', 4: 'special_election', 5: 'execution', 6: 'execution' },
  '7':  { 2: 'investigate_loyalty', 3: 'special_election', 4: 'execution', 5: 'execution' },
  '8':  { 2: 'investigate_loyalty', 3: 'special_election', 4: 'execution', 5: 'execution' },
  '9':  { 1: 'investigate_loyalty', 2: 'investigate_loyalty', 3: 'special_election', 4: 'execution', 5: 'execution' },
  '10': { 1: 'investigate_loyalty', 2: 'investigate_loyalty', 3: 'special_election', 4: 'execution', 5: 'execution' },
}

const POWER_LABELS: Record<string, string> = {
  'policy_peek': 'Raven\'s Eye',
  'investigate_loyalty': 'Loyalty Investigation',
  'special_election': 'Call Conclave',
  'execution': 'Royal Execution',
}

const WINNER_LABELS: Record<string, string> = {
  'loyalists_edicts': 'The Loyalists have enacted enough edicts to secure the realm!',
  'usurper_executed': 'The Usurper has been executed! The Loyalists win!',
  'traitors_edicts': 'The Shadow Court has enacted enough edicts to seize control!',
  'usurper_crowned': 'The Usurper has been crowned Lord Commander! The Shadow Court wins!',
}

async function advanceHerald(supabase: any, roomId: number, gs: any, players: any[]) {
  const alive = players.filter((p: any) => p.is_alive).sort((a: any, b: any) => a.seat_order - b.seat_order)
  if (alive.length === 0) return null

  let currentHeraldId = gs.current_herald_id
  if (gs.special_election_herald_pointer) {
    currentHeraldId = gs.special_election_herald_pointer
    await supabase.from('game_state').update({ special_election_herald_pointer: null }).eq('room_id', roomId)
  }

  const currentIdx = alive.findIndex((p: any) => p.id === currentHeraldId)
  const nextIdx = (currentIdx + 1) % alive.length
  return alive[nextIdx].id
}

async function reshuffleDeck(supabase: any, roomId: number) {
  const { data: allCards } = await supabase
    .from('policy_deck')
    .select('*')
    .eq('room_id', roomId)

  if (!allCards || allCards.length === 0) return

  const shuffled = shuffle(allCards)
  for (let i = 0; i < shuffled.length; i++) {
    await supabase.from('policy_deck').update({ pile: 'draw', position: i }).eq('id', shuffled[i].id)
  }
}

async function checkWinCondition(supabase: any, roomId: number, gs: any, context?: { executedPlayerId?: number }) {
  let winner: string | null = null

  if (gs.loyalist_edicts_passed >= 5) winner = 'loyalists_edicts'
  else if (gs.shadow_edicts_passed >= 6) winner = 'traitors_edicts'

  if (context?.executedPlayerId) {
    const { data: role } = await supabase.from('player_roles').select('role').eq('player_id', context.executedPlayerId).eq('room_id', roomId).single()
    if (role?.role === 'usurper') winner = 'usurper_executed'
  }

  if (winner) {
    await supabase.from('game_state').update({ winner, current_phase: 'game_over', updated_at: new Date().toISOString() }).eq('room_id', roomId)
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId)
    await supabase.from('event_log').insert({ room_id: roomId, event_type: 'game_over', description: `Game over! Winner: ${winner}` })
    return winner
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claimsData.claims.sub as string

    const { room_id, card_index } = await req.json()
    if (!room_id || card_index === undefined) {
      return new Response(JSON.stringify({ error: 'room_id and card_index required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs || gs.current_phase !== 'legislative') return new Response(JSON.stringify({ error: 'Not in legislative phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is LC
    const { data: lcPlayer } = await supabase.from('players').select('*').eq('id', gs.current_lord_commander_id).single()
    if (!lcPlayer || lcPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the Lord Commander can enact' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: currentRound } = await supabase.from('rounds').select('*').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    if (!currentRound || !currentRound.chancellor_hand) {
      return new Response(JSON.stringify({ error: 'No chancellor hand' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const hand = currentRound.chancellor_hand as string[]
    if (card_index < 0 || card_index >= hand.length) {
      return new Response(JSON.stringify({ error: 'Invalid card_index' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const enactedCard = hand[card_index]
    const discardedCard = hand[1 - card_index]

    // Set enacted_policy, clear chancellor_hand
    await supabase.from('rounds').update({ enacted_policy: enactedCard, chancellor_hand: null }).eq('id', currentRound.id)

    // Discard other card
    const { data: maxPos } = await supabase.from('policy_deck').select('position').eq('room_id', room_id).eq('pile', 'discard').order('position', { ascending: false }).limit(1).maybeSingle()
    await supabase.from('policy_deck').insert({ room_id, card_type: discardedCard, pile: 'discard', position: (maxPos?.position ?? -1) + 1 })

    // Increment counters
    const newShadow = enactedCard === 'shadow' ? gs.shadow_edicts_passed + 1 : gs.shadow_edicts_passed
    const newLoyalist = enactedCard === 'loyalist' ? gs.loyalist_edicts_passed + 1 : gs.loyalist_edicts_passed

    await supabase.from('game_state').update({
      shadow_edicts_passed: newShadow,
      loyalist_edicts_passed: newLoyalist,
      veto_unlocked: newShadow >= 5,
      updated_at: new Date().toISOString(),
    }).eq('room_id', room_id)

    // Reshuffle if needed
    const { data: remainingDraw } = await supabase.from('policy_deck').select('id').eq('room_id', room_id).eq('pile', 'draw')
    if (!remainingDraw || remainingDraw.length < 3) {
      await reshuffleDeck(supabase, room_id)
    }

    // Check win
    const updatedGs = { ...gs, shadow_edicts_passed: newShadow, loyalist_edicts_passed: newLoyalist }
    const winner = await checkWinCondition(supabase, room_id, updatedGs)
    if (winner) {
      await supabase.from('event_log').insert({ room_id, event_type: 'policy_enacted', description: `A ${enactedCard} edict has been enacted.`, round_id: currentRound.id })
      return new Response(JSON.stringify({ success: true, enacted: enactedCard, winner }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check power trigger
    const { data: room } = await supabase.from('rooms').select('player_count').eq('id', room_id).single()
    const playerCount = room?.player_count ?? 5
    const powerMap = POWER_TABLE[String(playerCount)] || POWER_TABLE['5']

    if (enactedCard === 'shadow') {
      const power = powerMap[newShadow]
      if (power) {
        await supabase.from('game_state').update({
          active_power: power,
          current_phase: 'executive_action',
          current_lord_commander_id: null,
          updated_at: new Date().toISOString(),
        }).eq('room_id', room_id)

        await supabase.from('rounds').update({ power_triggered: power }).eq('id', currentRound.id)

        await supabase.from('event_log').insert({ room_id, event_type: 'policy_enacted', description: `A shadow edict has been enacted. Executive power unlocked: ${power}.`, round_id: currentRound.id })

        return new Response(JSON.stringify({ success: true, enacted: enactedCard, power }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // No power — advance Herald, go to election
    const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', room_id)
    const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers || [])

    await supabase.from('game_state').update({
      current_herald_id: nextHeraldId,
      current_lord_commander_id: null,
      current_phase: 'election',
      active_power: null,
      updated_at: new Date().toISOString(),
    }).eq('room_id', room_id)

    // Create new round
    const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

    await supabase.from('event_log').insert({ room_id, event_type: 'policy_enacted', description: `A ${enactedCard} edict has been enacted.`, round_id: currentRound.id })

    return new Response(JSON.stringify({ success: true, enacted: enactedCard }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
