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
  const { data: allCards } = await supabase.from('policy_deck').select('*').eq('room_id', roomId)
  if (!allCards || allCards.length === 0) return
  const shuffled = shuffle(allCards)
  for (let i = 0; i < shuffled.length; i++) {
    await supabase.from('policy_deck').update({ pile: 'draw', position: i }).eq('id', shuffled[i].id)
  }
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

    const { room_id, accept } = await req.json()
    if (!room_id || accept === undefined) {
      return new Response(JSON.stringify({ error: 'room_id and accept required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs || gs.current_phase !== 'legislative') return new Response(JSON.stringify({ error: 'Not in legislative phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is Herald
    const { data: heraldPlayer } = await supabase.from('players').select('*').eq('id', gs.current_herald_id).single()
    if (!heraldPlayer || heraldPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the Herald can respond to veto' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: currentRound } = await supabase.from('rounds').select('*').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    if (!currentRound || !currentRound.veto_requested) {
      return new Response(JSON.stringify({ error: 'No veto pending' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!accept) {
      // Reject veto
      await supabase.from('rounds').update({ veto_approved: false }).eq('id', currentRound.id)
      await supabase.from('event_log').insert({ room_id, event_type: 'veto_rejected', description: 'The Herald has rejected the veto.', round_id: currentRound.id })
      return new Response(JSON.stringify({ success: true, veto_accepted: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Accept veto — discard both chancellor_hand cards
    await supabase.from('rounds').update({ veto_approved: true, chancellor_hand: null }).eq('id', currentRound.id)

    const hand = (currentRound.chancellor_hand as string[]) || []
    for (const card of hand) {
      const { data: maxPos } = await supabase.from('policy_deck').select('position').eq('room_id', room_id).eq('pile', 'discard').order('position', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('policy_deck').insert({ room_id, card_type: card, pile: 'discard', position: (maxPos?.position ?? -1) + 1 })
    }

    const newTracker = gs.election_tracker + 1

    // Reshuffle if needed
    const { data: remainingDraw } = await supabase.from('policy_deck').select('id').eq('room_id', room_id).eq('pile', 'draw')
    if (!remainingDraw || remainingDraw.length < 3) {
      await reshuffleDeck(supabase, room_id)
    }

    const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', room_id)

    if (newTracker >= 3) {
      // Chaos — enact top card
      const { data: topCards } = await supabase.from('policy_deck').select('*').eq('room_id', room_id).eq('pile', 'draw').order('position', { ascending: true }).limit(1)
      if (topCards && topCards.length > 0) {
        const chaosCard = topCards[0]
        await supabase.from('policy_deck').delete().eq('id', chaosCard.id)
        const newShadow = chaosCard.card_type === 'shadow' ? gs.shadow_edicts_passed + 1 : gs.shadow_edicts_passed
        const newLoyalist = chaosCard.card_type === 'loyalist' ? gs.loyalist_edicts_passed + 1 : gs.loyalist_edicts_passed

        const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers || [])
        await supabase.from('game_state').update({
          election_tracker: 0, shadow_edicts_passed: newShadow, loyalist_edicts_passed: newLoyalist,
          current_herald_id: nextHeraldId, current_lord_commander_id: null,
          last_elected_herald_id: null, last_elected_lord_commander_id: null,
          current_phase: 'election', veto_unlocked: newShadow >= 5,
          updated_at: new Date().toISOString(),
        }).eq('room_id', room_id)

        const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
        await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

        await supabase.from('event_log').insert({ room_id, event_type: 'veto_chaos', description: `Veto accepted. Election tracker reached 3! A ${chaosCard.card_type} edict was enacted by chaos.`, round_id: currentRound.id })
        return new Response(JSON.stringify({ success: true, veto_accepted: true, chaos: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Normal veto accept
    const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers || [])
    await supabase.from('game_state').update({
      election_tracker: newTracker, current_herald_id: nextHeraldId,
      current_lord_commander_id: null, current_phase: 'election',
      updated_at: new Date().toISOString(),
    }).eq('room_id', room_id)

    const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

    await supabase.from('event_log').insert({ room_id, event_type: 'veto_accepted', description: 'The Herald has accepted the veto. The agenda is discarded.', round_id: currentRound.id })
    return new Response(JSON.stringify({ success: true, veto_accepted: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
