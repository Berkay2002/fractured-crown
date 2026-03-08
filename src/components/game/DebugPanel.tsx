import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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
const POWERS: (GameState['active_power'])[] = [null, 'policy_peek', 'investigate_loyalty', 'special_election', 'execution'];
const WINNERS: (GameState['winner'])[] = [null, 'loyalists_edicts', 'usurper_executed', 'traitors_edicts', 'usurper_crowned'];

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

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Toggle button */}
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
                <Select value={state.phase} onValueChange={(v) => onChange({ phase: v as GameState['current_phase'] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHASES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {/* Shadow Edicts */}
              <Field label={`Shadow Edicts: ${state.shadowEdicts}`}>
                <Slider
                  value={[state.shadowEdicts]}
                  onValueChange={([v]) => onChange({ shadowEdicts: v })}
                  min={0} max={6} step={1}
                />
              </Field>

              {/* Loyalist Edicts */}
              <Field label={`Loyalist Edicts: ${state.loyalistEdicts}`}>
                <Slider
                  value={[state.loyalistEdicts]}
                  onValueChange={([v]) => onChange({ loyalistEdicts: v })}
                  min={0} max={5} step={1}
                />
              </Field>

              {/* Decay Override */}
              <Field label={`Decay Stage: ${state.decayOverride ?? 'auto'}`}>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={state.decayOverride !== null}
                    onCheckedChange={(on) => onChange({ decayOverride: on ? state.shadowEdicts : null })}
                  />
                  {state.decayOverride !== null && (
                    <Slider
                      value={[state.decayOverride]}
                      onValueChange={([v]) => onChange({ decayOverride: v })}
                      min={0} max={6} step={1}
                      className="flex-1"
                    />
                  )}
                </div>
              </Field>

              {/* Election Tracker */}
              <Field label={`Election Tracker: ${state.electionTracker}`}>
                <Slider
                  value={[state.electionTracker]}
                  onValueChange={([v]) => onChange({ electionTracker: v })}
                  min={0} max={3} step={1}
                />
              </Field>

              {/* Herald */}
              <Field label="Herald">
                <Select value={String(state.heraldId ?? '')} onValueChange={(v) => onChange({ heraldId: v ? Number(v) : null })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {players.map(p => <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {/* Lord Commander */}
              <Field label="Lord Commander">
                <Select value={String(state.lordCommanderId ?? '')} onValueChange={(v) => onChange({ lordCommanderId: v ? Number(v) : null })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {players.map(p => <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {/* Veto */}
              <Field label="Veto Unlocked">
                <Switch checked={state.vetoUnlocked} onCheckedChange={(v) => onChange({ vetoUnlocked: v })} />
              </Field>

              {/* Active Power */}
              <Field label="Active Power">
                <Select value={state.activePower ?? 'none'} onValueChange={(v) => onChange({ activePower: v === 'none' ? null : v as GameState['active_power'] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    {POWERS.filter(Boolean).map(p => <SelectItem key={p!} value={p!} className="text-xs">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {/* Winner */}
              <Field label="Winner">
                <Select value={state.winner ?? 'none'} onValueChange={(v) => onChange({ winner: v === 'none' ? null : v as GameState['winner'] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    {WINNERS.filter(Boolean).map(w => <SelectItem key={w!} value={w!} className="text-xs">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                    <Select
                      key={i}
                      value={(state.heraldHand ?? ['loyalist', 'shadow', 'loyalist'])[i]}
                      onValueChange={(v) => setHandCard('heraldHand', i, v)}
                    >
                      <SelectTrigger className="h-7 text-[10px] flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loyalist" className="text-xs">Loyalist</SelectItem>
                        <SelectItem value="shadow" className="text-xs">Shadow</SelectItem>
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </CollapsibleField>

              {/* Chancellor Hand */}
              <CollapsibleField label="LC Hand (2 cards)">
                <div className="flex gap-2">
                  {[0, 1].map(i => (
                    <Select
                      key={i}
                      value={(state.chancellorHand ?? ['loyalist', 'shadow'])[i]}
                      onValueChange={(v) => setHandCard('chancellorHand', i, v)}
                    >
                      <SelectTrigger className="h-7 text-[10px] flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loyalist" className="text-xs">Loyalist</SelectItem>
                        <SelectItem value="shadow" className="text-xs">Shadow</SelectItem>
                      </SelectContent>
                    </Select>
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
