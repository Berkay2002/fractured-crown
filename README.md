# Fractured Crown

**A browser-based multiplayer social deduction game for 5–10 players, set in a dark medieval fantasy world.**

Fractured Crown is a faithful reskin of *Secret Hitler* — recast as a struggle for a crumbling kingdom where Loyalists defend the Crown, Traitors conspire in the shadows, and a hidden Usurper seeks the throne.

🎮 **Play now:** [fractured-crown.lovable.app](https://fractured-crown.lovable.app)

---

## Gameplay

Each game assigns players secret roles:

| Role | Count | Goal |
|---|---|---|
| **Loyalist** | Majority | Pass 5 Loyalist Edicts or execute the Usurper |
| **Traitor** | Minority | Pass 6 Shadow Edicts or crown the Usurper as Lord Commander |
| **Usurper** | 1 (knows nothing) | Survive and get crowned Lord Commander after 3 Shadow Edicts |

### Game Flow

1. **Election** — The Herald nominates a Lord Commander; all players vote Ja/Nein
2. **Legislative Session** — The Herald draws 3 Royal Edicts, discards 1; the Lord Commander receives 2, enacts 1
3. **Executive Powers** — Shadow Edicts on certain board slots trigger powers: Investigate Loyalty, Policy Peek, Special Election, or Execution
4. **Repeat** until a win condition is met

Three failed elections in a row trigger **chaos**: the top edict is enacted automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| UI Components | shadcn/ui · Framer Motion |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Auth | Anonymous sessions via `supabase.auth.signInAnonymously()` |
| Realtime | Single Supabase Realtime channel per game room |
| Platform | Discord Activity SDK integration |

### Key Architecture Rules

- **All sensitive game logic runs in Edge Functions only** — role assignments, deck management, win conditions, and state transitions never execute on the client
- **Private card hands** are delivered via Edge Function response bodies, stored in local React state, and never written to Realtime-published columns
- **Single Realtime channel per room** — no overlapping subscriptions
- **Anonymous auth is by design** — no emails, passwords, or PII

---

## Project Structure

```
src/
├── components/
│   ├── game/          # GameBoard, PlayerCouncil, VotingPanel, overlays, etc.
│   ├── lobby/         # Lobby presence cursors
│   └── ui/            # shadcn/ui primitives
├── contexts/          # AuthContext, SoundContext, DiscordContext
├── hooks/             # useGameRoom, useSound, useLobbyPresence, etc.
├── lib/               # storageUrl, backgroundImage, utils
├── pages/             # Index, Room, JoinRoom, Privacy, Terms
└── integrations/
    └── supabase/      # Client config, generated types

supabase/
├── functions/         # Edge Functions (game logic)
│   ├── create-room/
│   ├── join-room/
│   ├── start-game/
│   ├── nominate-chancellor/
│   ├── submit-vote/
│   ├── herald-discard/
│   ├── enact-policy/
│   ├── request-veto/
│   ├── respond-veto/
│   ├── resolve-power/
│   ├── fetch-hand/
│   ├── vote-status/
│   └── reset-room/
└── migrations/        # Database schema migrations
```

---

## Development

```sh
# Install dependencies
npm install

# Start dev server
npm run dev
```

Requires a connected Supabase project with the schema migrations applied.

---

## Design System

**Aesthetic:** Dark medieval war room — gothic, candlelit, conspiratorial

| Token | Value |
|---|---|
| Background | `#0f0d0b` |
| Surface | `#1c1612` |
| Gold accent | `#c9a84c` |
| Crimson accent | `#8b1a1a` |
| Body text | `#e8dcc8` |
| Heading font | Cinzel |
| Body font | Crimson Text |
| Mono font | Courier Prime |

---

## Terminology

| Game concept | In-app name |
|---|---|
| President | Herald |
| Chancellor | Lord Commander |
| Liberal | Loyalist |
| Fascist | Traitor |
| Hitler | The Usurper |
| Policy tile | Royal Edict |
| Liberal policy | Loyalist Edict |
| Fascist policy | Shadow Edict |

---

## License

Private project. All rights reserved.
