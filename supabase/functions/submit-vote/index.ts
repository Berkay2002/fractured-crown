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
  const alive = players.filter(p => p.is_alive).sort((a, b) => a.seat_order - b.seat_order)
  if (alive.length === 0) return alive[0]?.id

  // If returning from special election, revert to stored pointer
  let currentHeraldId = gs.current_herald_id
  if (gs.special_election_herald_pointer) {
    currentHeraldId = gs.special_election_herald_pointer
    await supabase.from('game_state').update({ special_election_herald_pointer: null }).eq('room_id', roomId)
  }

  const currentIdx = alive.findIndex(p => p.id === currentHeraldId)
  const nextIdx = (currentIdx + 1) % alive.length
  return alive[nextIdx].id
}

async function dealCards(supabase: any, roomId: number, count: number) {
  const { data: cards } = await supabase
    .from('policy_deck')
    .select('*')
    .eq('room_id', roomId)
    .eq('pile', 'draw')
    .order('position', { ascending: true })
    .limit(count)

  return cards || []
}

async function reshuffleDeck(supabase: any, roomId: number) {
  // Move all discard to draw
  const { data: discardCards } = await supabase
    .from('policy_deck')
    .select('*')
    .eq('room_id', roomId)
    .eq('pile', 'discard')

  if (!discardCards || discardCards.length === 0) return

  const { data: drawCards } = await supabase
    .from('policy_deck')
    .select('*')
    .eq('room_id', roomId)
    .eq('pile', 'draw')

  const allCards = [...(drawCards || []), ...discardCards]
  const shuffled = shuffle(allCards)
  for (let i = 0; i < shuffled.length; i++) {
    await supabase.from('policy_deck').update({ pile: 'draw', position: i }).eq('id', shuffled[i].id)
  }
}

const WINNER_LABELS: Record<string, string> = {
  'loyalists_edicts': 'The Loyalists have enacted enough edicts to secure the realm!',
  'usurper_executed': 'The Usurper has been executed! The Loyalists win!',
  'traitors_edicts': 'The Shadow Court has enacted enough edicts to seize control!',
  'usurper_crowned': 'The Usurper has been crowned Lord Commander! The Shadow Court wins!',
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
    await supabase.from('event_log').insert({
      room_id: roomId,
      event_type: 'game_over',
      description: WINNER_LABELS[winner] || 'Game over! The realm has been decided.',
    })
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

    const { room_id, vote } = await req.json()
    if (!room_id || !vote || !['ja', 'nein'].includes(vote)) {
      return new Response(JSON.stringify({ error: 'room_id and vote (ja/nein) required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Validate caller is alive player
    const { data: player } = await supabase.from('players').select('*').eq('room_id', room_id).eq('user_id', userId).single()
    if (!player || !player.is_alive) return new Response(JSON.stringify({ error: 'Not a living player' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Get game state + current round
    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs || gs.current_phase !== 'election') return new Response(JSON.stringify({ error: 'Not in election phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: currentRound } = await supabase.from('rounds').select('*').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    if (!currentRound) return new Response(JSON.stringify({ error: 'No current round' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Check not already voted
    const { data: existingVote } = await supabase.from('votes').select('id').eq('round_id', currentRound.id).eq('player_id', player.id).maybeSingle()
    if (existingVote) return new Response(JSON.stringify({ error: 'Already voted' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Insert vote
    await supabase.from('votes').insert({ round_id: currentRound.id, room_id, player_id: player.id, vote, revealed: false })

    // Check if all alive players voted
    const { data: alivePlayers } = await supabase.from('players').select('id').eq('room_id', room_id).eq('is_alive', true)
    const { data: roundVotes } = await supabase.from('votes').select('*').eq('round_id', currentRound.id)

    if (!alivePlayers || !roundVotes || roundVotes.length < alivePlayers.length) {
      return new Response(JSON.stringify({ success: true, all_voted: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // All voted — tally
    const jaCount = roundVotes.filter(v => v.vote === 'ja').length
    const neinCount = roundVotes.filter(v => v.vote === 'nein').length
    const passed = jaCount > neinCount

    // Reveal all votes
    for (const v of roundVotes) {
      await supabase.from('votes').update({ revealed: true }).eq('id', v.id)
    }

    // Pause so clients can display the vote results before transitioning
    await new Promise(resolve => setTimeout(resolve, 7000))

    const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', room_id)
    if (!allPlayers) throw new Error('Failed to fetch players')

    if (passed) {
      // Check usurper-crowned win condition
      if (gs.shadow_edicts_passed >= 3 && gs.current_lord_commander_id) {
        const { data: lcRole } = await supabase.from('player_roles').select('role').eq('player_id', gs.current_lord_commander_id).eq('room_id', room_id).single()
        if (lcRole?.role === 'usurper') {
          await supabase.from('game_state').update({
            winner: 'usurper_crowned',
            current_phase: 'game_over',
            updated_at: new Date().toISOString(),
          }).eq('room_id', room_id)
          await supabase.from('rooms').update({ status: 'finished' }).eq('id', room_id)
          await supabase.from('event_log').insert({
            room_id,
            event_type: 'game_over',
            description: 'The Usurper has been crowned Lord Commander! The Shadow Court wins!',
            round_id: currentRound.id,
          })
          return new Response(JSON.stringify({ success: true, all_voted: true, passed: true, winner: 'usurper_crowned' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Set term limits
      await supabase.from('game_state').update({
        last_elected_herald_id: gs.current_herald_id,
        last_elected_lord_commander_id: gs.current_lord_commander_id,
        election_tracker: 0,
        updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      // Deal 3 cards
      const drawCards = await dealCards(supabase, room_id, 3)
      if (drawCards.length < 3) {
        await reshuffleDeck(supabase, room_id)
        const newCards = await dealCards(supabase, room_id, 3)
        drawCards.length = 0
        drawCards.push(...newCards)
      }

      const heraldHand = drawCards.map((c: any) => c.card_type)

      // Remove dealt cards from draw pile (move to "in_play" by deleting position)
      for (const card of drawCards) {
        await supabase.from('policy_deck').delete().eq('id', card.id)
      }

      // Write herald_hand to round
      await supabase.from('rounds').update({ herald_hand: heraldHand }).eq('id', currentRound.id)

      // Transition to legislative
      await supabase.from('game_state').update({ current_phase: 'legislative', updated_at: new Date().toISOString() }).eq('room_id', room_id)

      // Event
      await supabase.from('event_log').insert({
        room_id,
        event_type: 'vote_passed',
        description: `The vote passed (${jaCount}-${neinCount}). The legislative session begins.`,
        round_id: currentRound.id,
      })

      // Return herald_hand only to the herald
      const responseBody: any = { success: true, all_voted: true, passed: true }
      if (player.id === gs.current_herald_id) {
        responseBody.herald_hand = heraldHand
      }
      return new Response(JSON.stringify(responseBody), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } else {
      // Vote failed
      const newTracker = gs.election_tracker + 1

      await supabase.from('event_log').insert({
        room_id,
        event_type: 'vote_failed',
        description: `The vote failed (${jaCount}-${neinCount}). Election tracker: ${newTracker}/3.`,
        round_id: currentRound.id,
      })

      if (newTracker >= 3) {
        // Chaos policy
        const topCards = await dealCards(supabase, room_id, 1)
        if (topCards.length === 0) {
          await reshuffleDeck(supabase, room_id)
          topCards.push(...(await dealCards(supabase, room_id, 1)))
        }

        if (topCards.length > 0) {
          const chaosCard = topCards[0]
          await supabase.from('policy_deck').delete().eq('id', chaosCard.id)

          // Enact chaos policy
          await supabase.from('rounds').update({ enacted_policy: chaosCard.card_type, chaos_policy: true }).eq('id', currentRound.id)

          const updatedShadow = chaosCard.card_type === 'shadow' ? gs.shadow_edicts_passed + 1 : gs.shadow_edicts_passed
          const updatedLoyalist = chaosCard.card_type === 'loyalist' ? gs.loyalist_edicts_passed + 1 : gs.loyalist_edicts_passed

          // Check if reshuffle needed
          const { data: remainingDraw } = await supabase.from('policy_deck').select('id').eq('room_id', room_id).eq('pile', 'draw')
          if (!remainingDraw || remainingDraw.length < 3) {
            await reshuffleDeck(supabase, room_id)
          }

          const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers)

          await supabase.from('game_state').update({
            election_tracker: 0,
            shadow_edicts_passed: updatedShadow,
            loyalist_edicts_passed: updatedLoyalist,
            current_herald_id: nextHeraldId,
            current_lord_commander_id: null,
            last_elected_herald_id: null,
            last_elected_lord_commander_id: null,
            veto_unlocked: updatedShadow >= 5,
            updated_at: new Date().toISOString(),
          }).eq('room_id', room_id)

          // Check win
          const winGs = { ...gs, shadow_edicts_passed: updatedShadow, loyalist_edicts_passed: updatedLoyalist }
          const winner = await checkWinCondition(supabase, room_id, winGs)
          if (winner) {
            return new Response(JSON.stringify({ success: true, all_voted: true, passed: false, chaos: true, winner }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Create new round
          const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
          await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

          await supabase.from('event_log').insert({
            room_id,
            event_type: 'chaos_policy',
            description: `The council has failed to agree three times! A ${chaosCard.card_type === 'loyalist' ? 'Loyalist' : 'Shadow'} edict has been enacted by the will of chaos.`,
            round_id: currentRound.id,
          })

          return new Response(JSON.stringify({ success: true, all_voted: true, passed: false, chaos: true, enacted: chaosCard.card_type }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Normal fail — advance Herald
      const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers)
      await supabase.from('game_state').update({
        election_tracker: newTracker,
        current_herald_id: nextHeraldId,
        current_lord_commander_id: null,
        updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      // Create new round
      const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
      await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

      return new Response(JSON.stringify({ success: true, all_voted: true, passed: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
