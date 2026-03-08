
-- Create a SECURITY DEFINER function to check if a user is in a room
-- This avoids infinite recursion in RLS policies on the players table
CREATE OR REPLACE FUNCTION public.is_player_in_room(_user_id uuid, _room_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE user_id = _user_id AND room_id = _room_id
  )
$$;

-- Helper: get all room_ids for a user
CREATE OR REPLACE FUNCTION public.get_user_room_ids(_user_id uuid)
RETURNS SETOF bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id FROM public.players WHERE user_id = _user_id
$$;

-- Fix players_read policy to use the security definer function
DROP POLICY IF EXISTS "players_read" ON public.players;
CREATE POLICY "players_read" ON public.players
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

-- Fix chat_messages policies
DROP POLICY IF EXISTS "chat_read" ON public.chat_messages;
CREATE POLICY "chat_read" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

DROP POLICY IF EXISTS "chat_insert_own" ON public.chat_messages;
CREATE POLICY "chat_insert_own" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
    AND room_id IN (SELECT public.get_user_room_ids(auth.uid()))
  );

-- Fix event_log policy
DROP POLICY IF EXISTS "event_log_read" ON public.event_log;
CREATE POLICY "event_log_read" ON public.event_log
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

-- Fix game_state policy
DROP POLICY IF EXISTS "game_state_read" ON public.game_state;
CREATE POLICY "game_state_read" ON public.game_state
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

-- Fix player_roles policy
DROP POLICY IF EXISTS "player_roles_own_only" ON public.player_roles;
CREATE POLICY "player_roles_own_only" ON public.player_roles
  FOR SELECT TO authenticated
  USING (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  );

-- Fix rounds policy
DROP POLICY IF EXISTS "rounds_read" ON public.rounds;
CREATE POLICY "rounds_read" ON public.rounds
  FOR SELECT TO authenticated
  USING (room_id IN (SELECT public.get_user_room_ids(auth.uid())));

-- Fix votes policy
DROP POLICY IF EXISTS "votes_read_revealed" ON public.votes;
CREATE POLICY "votes_read_revealed" ON public.votes
  FOR SELECT TO authenticated
  USING (
    revealed = true
    AND room_id IN (SELECT public.get_user_room_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "votes_insert_own" ON public.votes;
CREATE POLICY "votes_insert_own" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  );

-- Fix presidential_actions policy
DROP POLICY IF EXISTS "presidential_actions_own" ON public.presidential_actions;
CREATE POLICY "presidential_actions_own" ON public.presidential_actions
  FOR SELECT TO authenticated
  USING (
    acting_player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  );
