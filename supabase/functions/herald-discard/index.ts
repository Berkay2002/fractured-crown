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

    const { room_id, card_index } = await req.json()
    if (!room_id || card_index === undefined || card_index === null) {
      return new Response(JSON.stringify({ error: 'room_id and card_index required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs || gs.current_phase !== 'legislative') return new Response(JSON.stringify({ error: 'Not in legislative phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is Herald
    const { data: heraldPlayer } = await supabase.from('players').select('*').eq('id', gs.current_herald_id).single()
    if (!heraldPlayer || heraldPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the Herald can discard' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: currentRound } = await supabase.from('rounds').select('*').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    if (!currentRound || !currentRound.herald_hand) {
      return new Response(JSON.stringify({ error: 'No herald hand' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const hand = currentRound.herald_hand as string[]
    if (card_index < 0 || card_index >= hand.length) {
      return new Response(JSON.stringify({ error: 'Invalid card_index' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const discardedCard = hand[card_index]
    const remaining = hand.filter((_: string, i: number) => i !== card_index)

    // Add discarded card to discard pile
    const { data: maxPos } = await supabase.from('policy_deck').select('position').eq('room_id', room_id).eq('pile', 'discard').order('position', { ascending: false }).limit(1).maybeSingle()
    const newPos = (maxPos?.position ?? -1) + 1

    await supabase.from('policy_deck').insert({ room_id, card_type: discardedCard, pile: 'discard', position: newPos })

    // Write chancellor_hand, clear herald_hand
    await supabase.from('rounds').update({ chancellor_hand: remaining, herald_hand: null }).eq('id', currentRound.id)

    // Event
    await supabase.from('event_log').insert({
      room_id,
      event_type: 'herald_discard',
      description: 'The Herald has reviewed the edicts and passed two to the Lord Commander.',
      round_id: currentRound.id,
    })

    return new Response(JSON.stringify({ success: true, chancellor_hand: remaining }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
