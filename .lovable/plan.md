

## Acknowledgment & Updated Plan for Phase 1

**Clarification noted**: `seat_order = 0` for the host in `create-room` is a temporary placeholder. The lobby UI must not treat `seat_order` as meaningful for display order or host identification. Host status is determined solely by `rooms.host_player_id`, never by `seat_order`. Final seat order is randomized in Phase 3's `start-game` function.

### Impact on Phase 1 Implementation

1. **`create-room` Edge Function**: Will assign `seat_order = 0` to the host as a simple insertion-order counter. No special semantics attached.

2. **`join-room` Edge Function**: Will assign incrementing `seat_order` values (1, 2, 3...) purely as a monotonic counter for join order. No gameplay meaning.

3. **Lobby UI**: Player list will be ordered by `joined_at` or `seat_order` for display consistency, but will explicitly use `rooms.host_player_id` to identify the host (crown icon, "Begin the Council" button visibility). No code path will assume `seat_order = 0` means host.

4. **Code comments**: The `seat_order` column and Edge Function assignments will include a comment: `-- placeholder; reshuffled randomly on game start`.

No other changes to the previously approved plan. Ready to implement.

