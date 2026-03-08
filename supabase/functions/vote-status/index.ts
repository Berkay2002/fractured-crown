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

    const { room_id, round_id } = await req.json()
    if (!room_id) {
      return new Response(JSON.stringify({ error: 'room_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!player) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let targetRoundId = round_id as number | null

    if (!targetRoundId) {
      const { data: latestRound } = await supabase
        .from('rounds')
        .select('id')
        .eq('room_id', room_id)
        .order('round_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      targetRoundId = latestRound?.id ?? null
    }

    if (!targetRoundId) {
      return new Response(JSON.stringify({
        success: true,
        cast_count: 0,
        alive_count: 0,
        has_voted: false,
        all_voted: false,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const [{ data: alivePlayers }, { data: roundVotes }] = await Promise.all([
      supabase.from('players').select('id').eq('room_id', room_id).eq('is_alive', true),
      supabase.from('votes').select('player_id').eq('round_id', targetRoundId),
    ])

    const aliveCount = alivePlayers?.length ?? 0
    const castCount = roundVotes?.length ?? 0
    const hasVoted = (roundVotes ?? []).some((v) => v.player_id === player.id)

    return new Response(JSON.stringify({
      success: true,
      round_id: targetRoundId,
      cast_count: castCount,
      alive_count: aliveCount,
      has_voted: hasVoted,
      all_voted: aliveCount > 0 && castCount >= aliveCount,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
