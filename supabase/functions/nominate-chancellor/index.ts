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

    const { room_id, nominee_id } = await req.json()
    if (!room_id || !nominee_id) return new Response(JSON.stringify({ error: 'room_id and nominee_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Get game state
    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs) return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (gs.current_phase !== 'election') return new Response(JSON.stringify({ error: 'Not in election phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is Herald
    const { data: heraldPlayer } = await supabase.from('players').select('*').eq('id', gs.current_herald_id).single()
    if (!heraldPlayer || heraldPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the Herald can nominate' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Validate nominee
    const { data: nominee } = await supabase.from('players').select('*').eq('id', nominee_id).eq('room_id', room_id).single()
    if (!nominee || !nominee.is_alive) return new Response(JSON.stringify({ error: 'Invalid nominee' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Term limit checks
    const { data: alivePlayers } = await supabase.from('players').select('id').eq('room_id', room_id).eq('is_alive', true)
    const aliveCount = alivePlayers?.length ?? 0

    if (nominee_id === gs.last_elected_lord_commander_id) {
      return new Response(JSON.stringify({ error: 'Term limited: was last Lord Commander' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    // In 6+ player games, last Herald is also ineligible
    if (aliveCount > 5 && nominee_id === gs.last_elected_herald_id) {
      return new Response(JSON.stringify({ error: 'Term limited: was last Herald' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Update game state
    await supabase.from('game_state').update({ current_lord_commander_id: nominee_id, updated_at: new Date().toISOString() }).eq('room_id', room_id)

    // Update current round
    const { data: currentRound } = await supabase.from('rounds').select('id').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    if (currentRound) {
      await supabase.from('rounds').update({ lord_commander_id: nominee_id }).eq('id', currentRound.id)
    }

    // Event log
    await supabase.from('event_log').insert({
      room_id,
      event_type: 'nomination',
      description: `${heraldPlayer.display_name} has nominated ${nominee.display_name} as Lord Commander.`,
      round_id: currentRound?.id ?? null,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
