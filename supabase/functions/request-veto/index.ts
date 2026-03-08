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
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = user.id

    const { room_id } = await req.json()
    if (!room_id) return new Response(JSON.stringify({ error: 'room_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: gs } = await supabase.from('game_state').select('*').eq('room_id', room_id).single()
    if (!gs || gs.current_phase !== 'legislative') return new Response(JSON.stringify({ error: 'Not in legislative phase' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!gs.veto_unlocked) return new Response(JSON.stringify({ error: 'Veto not unlocked' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Validate caller is LC
    const { data: lcPlayer } = await supabase.from('players').select('*').eq('id', gs.current_lord_commander_id).single()
    if (!lcPlayer || lcPlayer.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the Lord Commander can request veto' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: currentRound } = await supabase.from('rounds').select('*').eq('room_id', room_id).order('round_number', { ascending: false }).limit(1).single()
    if (!currentRound) return new Response(JSON.stringify({ error: 'No current round' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await supabase.from('rounds').update({ veto_requested: true }).eq('id', currentRound.id)

    await supabase.from('event_log').insert({
      room_id,
      event_type: 'veto_requested',
      description: `${lcPlayer.display_name} has invoked the veto power.`,
      round_id: currentRound.id,
    })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
