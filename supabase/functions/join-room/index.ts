import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = user.id

    // Parse body
    const { room_code, display_name } = await req.json()
    if (!room_code || typeof room_code !== 'string') {
      return new Response(JSON.stringify({ error: 'room_code is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!display_name || typeof display_name !== 'string' || display_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'display_name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const trimmedName = display_name.trim().slice(0, 30)
    const normalizedCode = room_code.trim().toUpperCase()

    // Service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, player_count')
      .eq('room_code', normalizedCode)
      .maybeSingle()

    if (roomError || !room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (room.status !== 'lobby') {
      return new Response(JSON.stringify({ error: 'Room is not accepting new players' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check idempotent rejoin
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingPlayer) {
      return new Response(JSON.stringify({
        room_id: room.id,
        player_id: existingPlayer.id,
        rejoined: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check capacity
    if (room.player_count >= 10) {
      return new Response(JSON.stringify({ error: 'Room is full (max 10 players)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Assign next seat_order (placeholder; reshuffled randomly on game start)
    const nextSeatOrder = room.player_count

    // Pick an available sigil (unique_sigil_per_room constraint)
    const ALL_SIGILS = ['crown', 'sword', 'shield', 'wolf', 'raven', 'rose', 'flame', 'anchor']
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('sigil')
      .eq('room_id', room.id)
    const takenSigils = new Set((existingPlayers || []).map(p => p.sigil))
    const availableSigil = ALL_SIGILS.find(s => !takenSigils.has(s)) || 'crown'

    // Insert player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        user_id: userId,
        display_name: trimmedName,
        seat_order: nextSeatOrder,
        sigil: availableSigil,
      })
      .select('id')
      .single()

    if (playerError || !player) {
      return new Response(JSON.stringify({ error: 'Failed to join room', details: playerError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Increment player_count
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ player_count: room.player_count + 1 })
      .eq('id', room.id)

    if (updateError) {
      console.error('Failed to increment player_count:', updateError)
    }

    return new Response(JSON.stringify({
      room_id: room.id,
      player_id: player.id,
      rejoined: false,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
