import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Validate host
    const { data: room } = await supabase.from('rooms').select('*').eq('id', room_id).single()
    if (!room) return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: hostPlayer } = await supabase.from('players').select('user_id').eq('id', room.host_player_id).single()
    if (!hostPlayer || hostPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the host can reset' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Delete game data (order matters for FK constraints)
    await supabase.from('presidential_actions').delete().eq('room_id', room_id)
    await supabase.from('votes').delete().eq('room_id', room_id)
    await supabase.from('rounds').delete().eq('room_id', room_id)
    await supabase.from('player_roles').delete().eq('room_id', room_id)
    await supabase.from('policy_deck').delete().eq('room_id', room_id)
    await supabase.from('event_log').delete().eq('room_id', room_id)
    await supabase.from('chat_messages').delete().eq('room_id', room_id)
    await supabase.from('game_state').delete().eq('room_id', room_id)

    // Count remaining players
    const { data: players } = await supabase.from('players').select('id').eq('room_id', room_id)
    const playerCount = players?.length ?? 0

    // Reset players to alive
    await supabase.from('players').update({ is_alive: true }).eq('room_id', room_id)

    // Reset room
    await supabase.from('rooms').update({ status: 'lobby', player_count: playerCount }).eq('id', room_id)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
