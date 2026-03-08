
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "chat_read" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert" ON public.chat_messages;

CREATE POLICY "chat_read"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (is_player_in_room(( SELECT auth.uid() AS uid), room_id));

CREATE POLICY "chat_insert"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (player_id IN ( SELECT players.id FROM players WHERE players.user_id = ( SELECT auth.uid() AS uid)));
