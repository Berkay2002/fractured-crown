import type { CursorPresence } from '@/hooks/useLobbyPresence';
import { sigilImageUrl } from '@/components/game/SigilAvatar';

export function LobbyPresenceCursor({ cursor }: { cursor: CursorPresence }) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: `${cursor.x}%`,
        top: `${cursor.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 80ms linear, top 80ms linear',
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="relative flex items-center justify-center">
          {/* Pulsing aura */}
          <div
            className="absolute h-9 w-9 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(201,168,76,0.4) 0%, transparent 70%)',
              animation: 'cursorAuraPulse 3s ease-in-out infinite',
            }}
          />
          {/* Sigil */}
          <img
            src={sigilImageUrl(cursor.sigil ?? 'crown')}
            alt={cursor.sigil}
            className="relative h-9 w-9 rounded-full object-cover"
            style={{
              boxShadow: '0 0 12px rgba(201,168,76,0.6), 0 0 4px rgba(201,168,76,0.9)',
              border: '1.5px solid rgba(201,168,76,0.7)',
            }}
          />
        </div>
        {/* Username pill */}
        <span
          className="whitespace-nowrap rounded-sm px-2 py-0.5 font-display text-[10px] tracking-wider"
          style={{
            color: '#c9a84c',
            backgroundColor: 'rgba(15,13,11,0.85)',
            border: '1px solid rgba(201,168,76,0.3)',
          }}
        >
          {cursor.username}
        </span>
      </div>
    </div>
  );
}
