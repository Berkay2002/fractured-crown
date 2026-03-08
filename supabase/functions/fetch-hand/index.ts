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

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claimsData.claims.sub as string

    const { room_id } = await req.json()
    if (!room_id) {
      return new Response(JSON.stringify({ error: 'room_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Get player
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!player) {
      return new Response(JSON.stringify({ error: 'Not a player in this room' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get game state
    const { data: gs } = await supabase
      .from('game_state')
      .select('current_phase, current_herald_id, current_lord_commander_id')
      .eq('room_id', room_id)
      .single()

    if (!gs || gs.current_phase !== 'legislative') {
      return new Response(JSON.stringify({ error: 'Not in legislative phase', hand: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const isHerald = player.id === gs.current_herald_id
    const isLC = player.id === gs.current_lord_commander_id

    if (!isHerald && !isLC) {
      return new Response(JSON.stringify({ error: 'Not herald or LC', hand: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get current round
    const { data: currentRound } = await supabase
      .from('rounds')
      .select('herald_hand, chancellor_hand')
      .eq('room_id', room_id)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!currentRound) {
      return new Response(JSON.stringify({ hand: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let hand: string[] | null = null
    let role: string = ''

    if (isHerald && currentRound.herald_hand) {
      hand = currentRound.herald_hand as string[]
      role = 'herald'
    } else if (isLC && currentRound.chancellor_hand) {
      hand = currentRound.chancellor_hand as string[]
      role = 'lord_commander'
    }

    return new Response(JSON.stringify({ hand, role }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
