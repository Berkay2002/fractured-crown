import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ROLE_DISTRIBUTION: Record<number, { loyalist: number; traitor: number; usurper: number }> = {
  5:  { loyalist: 3, traitor: 1, usurper: 1 },
  6:  { loyalist: 4, traitor: 1, usurper: 1 },
  7:  { loyalist: 4, traitor: 2, usurper: 1 },
  8:  { loyalist: 5, traitor: 2, usurper: 1 },
  9:  { loyalist: 5, traitor: 3, usurper: 1 },
  10: { loyalist: 6, traitor: 3, usurper: 1 },
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
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

    const { room_id } = await req.json()
    if (!room_id) return new Response(JSON.stringify({ error: 'room_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Validate room + host (settings come along for free via select *)
    const { data: room } = await supabase.from('rooms').select('*').eq('id', room_id).single()
    if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (room.status !== 'lobby') return new Response(JSON.stringify({ error: 'Game already started' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is host
    const { data: hostPlayer } = await supabase.from('players').select('user_id').eq('id', room.host_player_id).single()
    if (!hostPlayer || hostPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the host can start the game' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get players
    const { data: players } = await supabase.from('players').select('*').eq('room_id', room_id)
    if (!players || players.length < 5 || players.length > 10) {
      return new Response(JSON.stringify({ error: 'Need 5-10 players' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const playerCount = players.length
    const dist = ROLE_DISTRIBUTION[playerCount]

    // 1. Shuffle seat_order
    const shuffledOrders = shuffle(Array.from({ length: playerCount }, (_, i) => i))
    for (let i = 0; i < players.length; i++) {
      await supabase.from('players').update({ seat_order: shuffledOrders[i] }).eq('id', players[i].id)
    }

    // Re-fetch with updated seat orders
    const { data: seatedPlayers } = await supabase.from('players').select('*').eq('room_id', room_id).order('seat_order', { ascending: true })
    if (!seatedPlayers) throw new Error('Failed to fetch seated players')

    // 2. Assign roles
    const roles: Array<'loyalist' | 'traitor' | 'usurper'> = []
    for (let i = 0; i < dist.loyalist; i++) roles.push('loyalist')
    for (let i = 0; i < dist.traitor; i++) roles.push('traitor')
    roles.push('usurper')
    const shuffledRoles = shuffle(roles)

    // Build role assignments
    const roleAssignments = seatedPlayers.map((p, i) => ({
      player_id: p.id,
      room_id: room_id,
      role: shuffledRoles[i],
    }))

    // Calculate revealed_allies
    const traitorIds = roleAssignments.filter(r => r.role === 'traitor').map(r => r.player_id)
    const usurperId = roleAssignments.find(r => r.role === 'usurper')!.player_id

    const roleInserts = roleAssignments.map(r => {
      let revealed_allies: number[] = []
      if (playerCount <= 6) {
        // 5-6p: T and U see each other
        if (r.role === 'traitor') revealed_allies = [usurperId]
        if (r.role === 'usurper') revealed_allies = [...traitorIds]
      } else {
        // 7-10p: Ts see all T+U, U sees nothing
        if (r.role === 'traitor') {
          revealed_allies = [...traitorIds.filter(id => id !== r.player_id), usurperId]
        }
        // usurper gets []
      }
      return { ...r, revealed_allies }
    })

    const { error: rolesError } = await supabase.from('player_roles').insert(roleInserts)
    if (rolesError) throw new Error(`Failed to insert roles: ${rolesError.message}`)

    // 3. Initialize policy deck: 11 shadow + 6 loyalist, shuffled
    const deckCards: Array<'loyalist' | 'shadow'> = []
    for (let i = 0; i < 6; i++) deckCards.push('loyalist')
    for (let i = 0; i < 11; i++) deckCards.push('shadow')
    const shuffledDeck = shuffle(deckCards)
    const deckInserts = shuffledDeck.map((card, i) => ({
      room_id: room_id,
      card_type: card,
      pile: 'draw' as const,
      position: i,
    }))
    const { error: deckError } = await supabase.from('policy_deck').insert(deckInserts)
    if (deckError) throw new Error(`Failed to insert deck: ${deckError.message}`)

    // 4. Pick random first Herald
    const firstHerald = seatedPlayers[Math.floor(Math.random() * seatedPlayers.length)]

    // 5. Create game_state
    const { error: gsError } = await supabase.from('game_state').insert({
      room_id: room_id,
      current_phase: 'election',
      current_herald_id: firstHerald.id,
      election_tracker: 0,
      shadow_edicts_passed: 0,
      loyalist_edicts_passed: 0,
      veto_unlocked: false,
    })
    if (gsError) throw new Error(`Failed to create game state: ${gsError.message}`)

    // 6. Create first round
    const { error: roundError } = await supabase.from('rounds').insert({
      room_id: room_id,
      round_number: 1,
      herald_id: firstHerald.id,
    })
    if (roundError) throw new Error(`Failed to create round: ${roundError.message}`)

    // 7. Set room status
    await supabase.from('rooms').update({ status: 'in_progress', player_count: playerCount }).eq('id', room_id)

    // 8. Event log
    await supabase.from('event_log').insert({
      room_id: room_id,
      event_type: 'game_started',
      description: 'The council has been called to order.',
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
