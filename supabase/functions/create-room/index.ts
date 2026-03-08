import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// 6-char uppercase letters, excluding O, I, L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
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

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = claimsData.claims.sub as string

    // Parse body
    const { display_name } = await req.json()
    if (!display_name || typeof display_name !== 'string' || display_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'display_name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const trimmedName = display_name.trim().slice(0, 30)

    // Service role client for writes
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Generate unique room code (retry on collision)
    let roomCode = ''
    let attempts = 0
    while (attempts < 10) {
      roomCode = generateRoomCode()
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', roomCode)
        .maybeSingle()
      if (!existing) break
      attempts++
    }
    if (attempts >= 10) {
      return new Response(JSON.stringify({ error: 'Failed to generate unique room code' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ room_code: roomCode, status: 'lobby', player_count: 1 })
      .select('id, room_code')
      .single()

    if (roomError || !room) {
      return new Response(JSON.stringify({ error: 'Failed to create room', details: roomError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert host as first player (seat_order = 0, placeholder)
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        user_id: userId,
        display_name: trimmedName,
        seat_order: 0, // placeholder; reshuffled randomly on game start
      })
      .select('id')
      .single()

    if (playerError || !player) {
      return new Response(JSON.stringify({ error: 'Failed to create player', details: playerError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Set host_player_id on room
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ host_player_id: player.id })
      .eq('id', room.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to set host', details: updateError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      room_id: room.id,
      room_code: room.room_code,
      player_id: player.id,
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
