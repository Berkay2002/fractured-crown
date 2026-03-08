import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    await supabase.from('event_log').insert({ room_id: roomId, event_type: 'game_over', description: WINNER_LABELS[winner] || 'Game over! The realm has been decided.' })
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

    const { room_id, action_type, target_player_id } = await req.json()
    if (!room_id || !action_type) {
      return new Response(JSON.stringify({ error: 'room_id and action_type required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs || gs.current_phase !== 'executive_action') return new Response(JSON.stringify({ error: 'Not in executive action phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (gs.active_power !== action_type) return new Response(JSON.stringify({ error: 'Wrong action type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is Herald
    const { data: heraldPlayer } = await supabase.from('players').select('*').eq('id', gs.current_herald_id).single()
    if (!heraldPlayer || heraldPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the Herald can resolve powers' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: currentRound } = await supabase.from('rounds').select('*').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    const { data: allPlayers } = await supabase.from('players').select('*').eq('room_id', room_id)
    if (!allPlayers) throw new Error('Failed to fetch players')

    // POLICY PEEK
    if (action_type === 'policy_peek') {
      const { data: topCards } = await supabase.from('policy_deck').select('*').eq('room_id', room_id).eq('pile', 'draw').order('position', { ascending: true }).limit(3)
      const peekedCards = (topCards || []).map((c: any) => c.card_type)

      await supabase.from('presidential_actions').insert({
        room_id, round_id: currentRound!.id, acting_player_id: heraldPlayer.id,
        action_type: 'policy_peek', result: { cards: peekedCards },
      })

      const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers)
      await supabase.from('game_state').update({
        active_power: null, current_phase: 'election', current_herald_id: nextHeraldId,
        current_lord_commander_id: null, updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
      await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

      await supabase.from('event_log').insert({ room_id, event_type: 'policy_peek', description: 'The Herald has consulted the Raven\'s Eye.', round_id: currentRound!.id })

      return new Response(JSON.stringify({ success: true, peeked_cards: peekedCards }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // INVESTIGATE LOYALTY
    if (action_type === 'investigate_loyalty') {
      if (!target_player_id) return new Response(JSON.stringify({ error: 'target_player_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const { data: targetRole } = await supabase.from('player_roles').select('role').eq('player_id', target_player_id).eq('room_id', room_id).single()
      if (!targetRole) return new Response(JSON.stringify({ error: 'Target role not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const team = targetRole.role === 'loyalist' ? 'loyalist' : 'shadow_court'

      await supabase.from('presidential_actions').insert({
        room_id, round_id: currentRound!.id, acting_player_id: heraldPlayer.id,
        action_type: 'investigate_loyalty', target_player_id, result: { team },
      })

      const targetPlayer = allPlayers.find((p: any) => p.id === target_player_id)

      const nextHeraldId = await advanceHerald(supabase, room_id, gs, allPlayers)
      await supabase.from('game_state').update({
        active_power: null, current_phase: 'election', current_herald_id: nextHeraldId,
        current_lord_commander_id: null, updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
      await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

      await supabase.from('event_log').insert({ room_id, event_type: 'investigate_loyalty', description: `The Herald has investigated ${targetPlayer?.display_name ?? 'a player'}'s loyalty.`, round_id: currentRound!.id })

      return new Response(JSON.stringify({ success: true, team }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // SPECIAL ELECTION
    if (action_type === 'special_election') {
      if (!target_player_id) return new Response(JSON.stringify({ error: 'target_player_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Store current herald as the pointer to revert to after this special round
      await supabase.from('game_state').update({
        special_election_herald_pointer: gs.current_herald_id,
        current_herald_id: target_player_id,
        active_power: null, current_phase: 'election', current_lord_commander_id: null,
        updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      await supabase.from('presidential_actions').insert({
        room_id, round_id: currentRound!.id, acting_player_id: heraldPlayer.id,
        action_type: 'special_election', target_player_id,
      })

      const targetPlayer = allPlayers.find((p: any) => p.id === target_player_id)

      const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
      await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: target_player_id })

      await supabase.from('event_log').insert({ room_id, event_type: 'special_election', description: `The Herald has called a conclave. ${targetPlayer?.display_name ?? 'A player'} is the new Herald.`, round_id: currentRound!.id })

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // EXECUTION
    if (action_type === 'execution') {
      if (!target_player_id) return new Response(JSON.stringify({ error: 'target_player_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      await supabase.from('players').update({ is_alive: false }).eq('id', target_player_id)

      await supabase.from('presidential_actions').insert({
        room_id, round_id: currentRound!.id, acting_player_id: heraldPlayer.id,
        action_type: 'execution', target_player_id,
      })

      const targetPlayer = allPlayers.find((p: any) => p.id === target_player_id)

      await supabase.from('event_log').insert({ room_id, event_type: 'execution', description: `${targetPlayer?.display_name ?? 'A player'} has been executed by royal decree.`, round_id: currentRound!.id })

      // Check win
      const winner = await checkWinCondition(supabase, room_id, gs, { executedPlayerId: target_player_id })
      if (winner) {
        return new Response(JSON.stringify({ success: true, winner }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // No win — advance
      // Refetch players since one is now dead
      const { data: updatedPlayers } = await supabase.from('players').select('*').eq('room_id', room_id)
      const nextHeraldId = await advanceHerald(supabase, room_id, gs, updatedPlayers || [])
      await supabase.from('game_state').update({
        active_power: null, current_phase: 'election', current_herald_id: nextHeraldId,
        current_lord_commander_id: null, updated_at: new Date().toISOString(),
      }).eq('room_id', room_id)

      const { data: latestRound } = await supabase.from('rounds').select('round_number').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
      await supabase.from('rounds').insert({ room_id, round_number: (latestRound?.round_number ?? 0) + 1, herald_id: nextHeraldId })

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
