import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Tables } from '@/integrations/supabase/types';

type GameState = Tables<'game_state'>;
type Player = Tables<'players'>;

export interface DebugState {
  phase: GameState['current_phase'];
  shadowEdicts: number;
  loyalistEdicts: number;
  electionTracker: number;
  heraldId: number | null;
  lordCommanderId: number | null;
  vetoUnlocked: boolean;
  activePower: GameState['active_power'];
  winner: GameState['winner'];
  deadPlayerIds: Set<number>;
  decayOverride: number | null;
  heraldHand: string[] | null;
  chancellorHand: string[] | null;
}

interface DebugPanelProps {
  state: DebugState;
  onChange: (patch: Partial<DebugState>) => void;
  players: Player[];
}

const PHASES: GameState['current_phase'][] = ['election', 'legislative', 'executive_action', 'game_over'];
const POWERS: { label: string; value: string }[] = [
  { label: 'None', value: 'none' },
  { label: 'Policy Peek', value: 'policy_peek' },
  { label: 'Investigate', value: 'investigate_loyalty' },
  { label: 'Special Election', value: 'special_election' },
  { label: 'Execution', value: 'execution' },
];
const WINNERS: { label: string; value: string }[] = [
  { label: 'None', value: 'none' },
  { label: 'Loyalists (Edicts)', value: 'loyalists_edicts' },
  { label: 'Usurper Executed', value: 'usurper_executed' },
  { label: 'Traitors (Edicts)', value: 'traitors_edicts' },
  { label: 'Usurper Crowned', value: 'usurper_crowned' },
];

const STORAGE_KEY = 'fc-debug-panel';

const DebugPanel = ({ state, onChange, players }: DebugPanelProps) => {
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY + '-open') === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY + '-open', open ? '1' : '0'); } catch {}
  }, [open]);

  const toggleDead = (id: number) => {
    const next = new Set(state.deadPlayerIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange({ deadPlayerIds: next });
  };

  const setHandCard = (hand: 'heraldHand' | 'chancellorHand', index: number, value: string) => {
    const max = hand === 'heraldHand' ? 3 : 2;
    const current = state[hand] ?? Array(max).fill('loyalist');
    const next = [...current];
    next[index] = value;
    onChange({ [hand]: next });
  };

  const selectClass = 'h-8 w-full rounded border border-border bg-card px-2 font-body text-xs text-foreground focus:border-primary focus:outline-none';
  const rangeClass = 'w-full accent-[hsl(var(--primary))] cursor-pointer';

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/40 bg-card shadow-lg transition-colors hover:border-primary hover:bg-primary/10"
        title="Debug Panel"
      >
        <Settings2 className="h-5 w-5 text-primary" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-80 max-h-[75vh] overflow-y-auto rounded-lg border-2 border-primary/30 bg-card p-4 shadow-2xl"
          >
            <h3 className="mb-4 font-display text-sm uppercase tracking-widest text-primary">
              Debug Controls
            </h3>

            <div className="space-y-4">
              {/* Phase */}
              <Field label="Phase">
                <select
                  className={selectClass}
                  value={state.phase}
                  onChange={(e) => onChange({ phase: e.target.value as GameState['current_phase'] })}
                >
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>

              {/* Shadow Edicts */}
              <Field label={`Shadow Edicts: ${state.shadowEdicts}`}>
                <input type="range" className={rangeClass} value={state.shadowEdicts} onChange={(e) => onChange({ shadowEdicts: Number(e.target.value) })} min={0} max={6} step={1} />
              </Field>

              {/* Loyalist Edicts */}
              <Field label={`Loyalist Edicts: ${state.loyalistEdicts}`}>
                <input type="range" className={rangeClass} value={state.loyalistEdicts} onChange={(e) => onChange({ loyalistEdicts: Number(e.target.value) })} min={0} max={5} step={1} />
              </Field>

              {/* Decay Override */}
              <Field label={`Decay Stage: ${state.decayOverride ?? 'auto'}`}>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={state.decayOverride !== null}
                    onCheckedChange={(on) => onChange({ decayOverride: on ? state.shadowEdicts : null })}
                  />
                  {state.decayOverride !== null && (
                    <input type="range" className={`${rangeClass} flex-1`} value={state.decayOverride} onChange={(e) => onChange({ decayOverride: Number(e.target.value) })} min={0} max={6} step={1} />
                  )}
                </div>
              </Field>

              {/* Election Tracker */}
              <Field label={`Election Tracker: ${state.electionTracker}`}>
                <input type="range" className={rangeClass} value={state.electionTracker} onChange={(e) => onChange({ electionTracker: Number(e.target.value) })} min={0} max={3} step={1} />
              </Field>

              {/* Herald */}
              <Field label="Herald">
                <select className={selectClass} value={state.heraldId ?? ''} onChange={(e) => onChange({ heraldId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">None</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </Field>

              {/* Lord Commander */}
              <Field label="Lord Commander">
                <select className={selectClass} value={state.lordCommanderId ?? ''} onChange={(e) => onChange({ lordCommanderId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">None</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </Field>

              {/* Veto */}
              <Field label="Veto Unlocked">
                <Switch checked={state.vetoUnlocked} onCheckedChange={(v) => onChange({ vetoUnlocked: v })} />
              </Field>

              {/* Active Power */}
              <Field label="Active Power">
                <select className={selectClass} value={state.activePower ?? 'none'} onChange={(e) => onChange({ activePower: e.target.value === 'none' ? null : e.target.value as GameState['active_power'] })}>
                  {POWERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>

              {/* Winner */}
              <Field label="Winner">
                <select className={selectClass} value={state.winner ?? 'none'} onChange={(e) => onChange({ winner: e.target.value === 'none' ? null : e.target.value as GameState['winner'] })}>
                  {WINNERS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </Field>

              {/* Dead Players */}
              <Field label="Dead Players">
                <div className="flex flex-wrap gap-1">
                  {players.map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleDead(p.id)}
                      className={`rounded border px-1.5 py-0.5 font-body text-[10px] transition-colors ${
                        state.deadPlayerIds.has(p.id)
                          ? 'border-accent bg-accent/20 text-accent-foreground'
                          : 'border-border bg-card text-foreground'
                      }`}
                    >
                      {p.display_name}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Herald Hand */}
              <CollapsibleField label="Herald Hand (3 cards)">
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <select
                      key={i}
                      className={`${selectClass} flex-1`}
                      value={(state.heraldHand ?? ['loyalist', 'shadow', 'loyalist'])[i]}
                      onChange={(e) => setHandCard('heraldHand', i, e.target.value)}
                    >
                      <option value="loyalist">Loyalist</option>
                      <option value="shadow">Shadow</option>
                    </select>
                  ))}
                </div>
              </CollapsibleField>

              {/* Chancellor Hand */}
              <CollapsibleField label="LC Hand (2 cards)">
                <div className="flex gap-2">
                  {[0, 1].map(i => (
                    <select
                      key={i}
                      className={`${selectClass} flex-1`}
                      value={(state.chancellorHand ?? ['loyalist', 'shadow'])[i]}
                      onChange={(e) => setHandCard('chancellorHand', i, e.target.value)}
                    >
                      <option value="loyalist">Loyalist</option>
                      <option value="shadow">Shadow</option>
                    </select>
                  ))}
                </div>
              </CollapsibleField>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
    {children}
  </div>
);

const CollapsibleField = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between font-display text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {label}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && children}
    </div>
  );
};

export default DebugPanel;
