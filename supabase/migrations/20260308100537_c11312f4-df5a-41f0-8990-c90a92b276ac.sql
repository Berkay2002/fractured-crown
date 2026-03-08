
ALTER TABLE public.game_state ADD COLUMN IF NOT EXISTS special_election_herald_pointer bigint;

CREATE POLICY "player_roles_game_over" ON public.player_roles
  FOR SELECT TO authenticated
  USING (
    room_id IN (SELECT get_user_room_ids((SELECT auth.uid())))
    AND EXISTS (
      SELECT 1 FROM public.game_state gs
      WHERE gs.room_id = player_roles.room_id
      AND gs.current_phase = 'game_over'
    )
  );
