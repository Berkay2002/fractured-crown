import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

export interface GameSettings {
  turn_timer_enabled: boolean;
  turn_timer_seconds: number;
  veto_enabled: boolean;
  allow_spectators: boolean;
  reveal_team_size: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_SETTINGS: GameSettings = {
  turn_timer_enabled: false,
  turn_timer_seconds: 120,
  veto_enabled: true,
  allow_spectators: false,
  reveal_team_size: true,
};

// eslint-disable-next-line react-refresh/only-export-components
export function parseSettings(raw: unknown): GameSettings {
  if (raw && typeof raw === 'object') {
    const s = raw as Record<string, unknown>;
    return {
      turn_timer_enabled: typeof s.turn_timer_enabled === 'boolean' ? s.turn_timer_enabled : DEFAULT_SETTINGS.turn_timer_enabled,
      turn_timer_seconds: typeof s.turn_timer_seconds === 'number' ? s.turn_timer_seconds : DEFAULT_SETTINGS.turn_timer_seconds,
      veto_enabled: typeof s.veto_enabled === 'boolean' ? s.veto_enabled : DEFAULT_SETTINGS.veto_enabled,
      allow_spectators: typeof s.allow_spectators === 'boolean' ? s.allow_spectators : DEFAULT_SETTINGS.allow_spectators,
      reveal_team_size: typeof s.reveal_team_size === 'boolean' ? s.reveal_team_size : DEFAULT_SETTINGS.reveal_team_size,
    };
  }
  return { ...DEFAULT_SETTINGS };
}

// ─── Wax seal toggle ───────────────────────────────────────────

function WaxSealToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer'
      } ${checked ? 'bg-primary/30' : 'bg-[#3a3028]'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.2 }}
        className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-md ${
          checked
            ? 'bg-primary shadow-[0_0_8px_hsl(43_50%_54%/0.5)]'
            : 'bg-[#3a3028] border border-[#4a3f32]'
        }`}
        style={{ marginLeft: checked ? '1.5rem' : '0.25rem' }}
      >
        {/* Seal dot */}
        <span className={`block h-2 w-2 rounded-full transition-colors duration-200 ${
          checked ? 'bg-primary-foreground' : 'bg-[#5a4f42]'
        }`} />
      </motion.span>
    </button>
  );
}

// ─── Duration selector ─────────────────────────────────────────

const DURATIONS = [60, 120, 180] as const;
const DURATION_LABELS: Record<number, string> = { 60: '1 min', 120: '2 min', 180: '3 min' };

function DurationSelector({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="flex gap-2 pt-2 pl-1">
        {DURATIONS.map((d) => (
          <button
            key={d}
            disabled={disabled}
            onClick={() => !disabled && onChange(d)}
            className={`rounded-md border px-3 py-1.5 font-display text-xs tracking-wider transition-all duration-200 ${
              value === d
                ? 'border-primary bg-primary/15 text-primary shadow-[0_0_6px_hsl(43_50%_54%/0.3)]'
                : 'border-border bg-[#1c1612] text-muted-foreground hover:border-muted-foreground/40'
            } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {DURATION_LABELS[d]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Setting row ───────────────────────────────────────────────

interface SettingRowDef {
  key: keyof GameSettings;
  label: string;
  description: string;
}

const SETTING_ROWS: SettingRowDef[] = [
  {
    key: 'turn_timer_enabled',
    label: 'Turn Timer',
    description: 'Herald and Lord Commander must act within the time limit or their turn auto-skips.',
  },
  {
    key: 'veto_enabled',
    label: 'Veto Power',
    description: 'The Lord Commander may request a veto after 5 Shadow Edicts are enacted.',
  },
  {
    key: 'allow_spectators',
    label: 'Spectators',
    description: 'Allow players to join the room as observers without participating.',
  },
  {
    key: 'reveal_team_size',
    label: 'Reveal Team Sizes',
    description: 'At game start, players are told how many Traitors lurk among them.',
  },
];

// ─── Main component ───────────────────────────────────────────

interface RoyalDecreesProps {
  roomId: number;
  settings: GameSettings;
  isHost: boolean;
}

export default function RoyalDecrees({ roomId, settings, isHost }: RoyalDecreesProps) {
  const updateSetting = async (patch: Partial<GameSettings>) => {
    const updated = { ...settings, ...patch };
    await supabase.from('rooms').update({ settings: updated as unknown as Json }).eq('id', roomId);
  };

  // ── Non-host: read-only pill badges ──
  if (!isHost) {
    const pills: string[] = [];
    if (settings.veto_enabled) pills.push('Veto Enabled');
    if (settings.turn_timer_enabled) pills.push(`${DURATION_LABELS[settings.turn_timer_seconds] ?? '2 min'} Timer`);
    if (settings.allow_spectators) pills.push('Spectators');
    if (settings.reveal_team_size) pills.push('Team Sizes Revealed');

    if (pills.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6 flex w-full max-w-lg md:max-w-none flex-col items-center gap-2"
      >
        <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          Royal Decrees
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {pills.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="border-primary/40 bg-primary/5 font-display text-[10px] tracking-wider text-primary"
            >
              {label}
            </Badge>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Host: interactive settings ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="mb-6 w-full max-w-lg md:max-w-none"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <ScrollText className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm uppercase tracking-widest text-primary">
          Royal Decrees
        </h2>
      </div>

      {/* Settings card */}
      <div className="rounded-lg border border-[#c9a84c]/20 bg-card overflow-hidden">
        <div className="bg-[#2a1f14] divide-y divide-primary/15">
          {SETTING_ROWS.map((row) => {
            const checked = !!settings[row.key];
            return (
              <div key={row.key} className="px-4 py-3 md:py-4 lg:py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-sm tracking-wide text-foreground">
                      {row.label}
                    </p>
                    <p className="mt-0.5 font-body text-xs italic text-[#8a7a6a]">
                      {row.description}
                    </p>
                  </div>
                  <WaxSealToggle
                    checked={checked}
                    onChange={(v) => updateSetting({ [row.key]: v })}
                  />
                </div>

                {/* Timer duration sub-option */}
                <AnimatePresence>
                  {row.key === 'turn_timer_enabled' && settings.turn_timer_enabled && (
                    <DurationSelector
                      value={settings.turn_timer_seconds}
                      onChange={(v) => updateSetting({ turn_timer_seconds: v })}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
