-- Scope all policies to authenticated role only (except rooms_read which needs public access for join page)

-- chat_messages
DROP POLICY IF EXISTS "chat_read" ON public.chat_messages;
CREATE POLICY "chat_read" ON public.chat_messages FOR SELECT TO authenticated
  USING (room_id IN (SELECT get_user_room_ids(auth.uid())));

DROP POLICY IF EXISTS "chat_insert_own" ON public.chat_messages;
CREATE POLICY "chat_insert_own" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
    AND room_id IN (SELECT get_user_room_ids(auth.uid()))
  );

-- event_log
DROP POLICY IF EXISTS "event_log_read" ON public.event_log;
CREATE POLICY "event_log_read" ON public.event_log FOR SELECT TO authenticated
  USING (room_id IN (SELECT get_user_room_ids(auth.uid())));

-- game_state
DROP POLICY IF EXISTS "game_state_read" ON public.game_state;
CREATE POLICY "game_state_read" ON public.game_state FOR SELECT TO authenticated
  USING (room_id IN (SELECT get_user_room_ids(auth.uid())));

-- players
DROP POLICY IF EXISTS "players_read" ON public.players;
CREATE POLICY "players_read" ON public.players FOR SELECT TO authenticated
  USING (room_id IN (SELECT get_user_room_ids(auth.uid())));

DROP POLICY IF EXISTS "players_insert" ON public.players;
CREATE POLICY "players_insert" ON public.players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- rounds
DROP POLICY IF EXISTS "rounds_read" ON public.rounds;
CREATE POLICY "rounds_read" ON public.rounds FOR SELECT TO authenticated
  USING (room_id IN (SELECT get_user_room_ids(auth.uid())));

-- votes
DROP POLICY IF EXISTS "votes_read_revealed" ON public.votes;
CREATE POLICY "votes_read_revealed" ON public.votes FOR SELECT TO authenticated
  USING (revealed = true AND room_id IN (SELECT get_user_room_ids(auth.uid())));

DROP POLICY IF EXISTS "votes_insert_own" ON public.votes;
CREATE POLICY "votes_insert_own" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- player_roles
DROP POLICY IF EXISTS "player_roles_own_only" ON public.player_roles;
CREATE POLICY "player_roles_own_only" ON public.player_roles FOR SELECT TO authenticated
  USING (player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "player_roles_game_over" ON public.player_roles;
CREATE POLICY "player_roles_game_over" ON public.player_roles FOR SELECT TO authenticated
  USING (
    room_id IN (SELECT get_user_room_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM game_state gs
      WHERE gs.room_id = player_roles.room_id
      AND gs.current_phase = 'game_over'::game_phase
    )
  );

-- presidential_actions
DROP POLICY IF EXISTS "presidential_actions_own" ON public.presidential_actions;
CREATE POLICY "presidential_actions_own" ON public.presidential_actions FOR SELECT TO authenticated
  USING (acting_player_id IN (SELECT id FROM players WHERE user_id = auth.uid()));

-- rooms (read stays public, update scoped to authenticated)
DROP POLICY IF EXISTS "rooms_host_update" ON public.rooms;
CREATE POLICY "rooms_host_update" ON public.rooms FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM players WHERE id = rooms.host_player_id));