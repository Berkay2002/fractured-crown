-- Allow players to delete their own record (for leaving a room)
CREATE POLICY "players_delete_own"
ON public.players
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Function to decrement player_count when a player is deleted
CREATE OR REPLACE FUNCTION public.decrement_player_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.rooms
  SET player_count = player_count - 1
  WHERE id = OLD.room_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_decrement_player_count
AFTER DELETE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.decrement_player_count();