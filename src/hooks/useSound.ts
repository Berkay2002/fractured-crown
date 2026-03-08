// Programmatic sound system using Web Audio API — no external audio files
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'fc-sound-enabled';

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // Cleanup
  useEffect(() => () => {
    ctxRef.current?.close();
  }, []);

  // Helper: play a tone
  const tone = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) => {
    if (!enabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }, [enabled, getCtx]);

  // Helper: noise burst (for thud/press sounds)
  const noiseBurst = useCallback((duration: number, volume = 0.1, delay = 0) => {
    if (!enabled) return;
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
  }, [enabled, getCtx]);

  // --- Sound effects ---

  /** Soft wax seal press */
  const playVoteCast = useCallback(() => {
    noiseBurst(0.12, 0.15);
    tone(120, 0.15, 'sine', 0.08);
  }, [noiseBurst, tone]);

  /** Ascending tone per card flip — call with index for stagger */
  const playVoteReveal = useCallback((index: number) => {
    const baseFreq = 300 + index * 80;
    tone(baseFreq, 0.25, 'triangle', 0.1, index * 0.15);
  }, [tone]);

  /** Deep bell toll — warm for loyalist, ominous for shadow */
  const playEdictEnacted = useCallback((type: 'loyalist' | 'shadow') => {
    if (type === 'loyalist') {
      tone(220, 1.5, 'sine', 0.18);
      tone(330, 1.2, 'sine', 0.08, 0.05);
      tone(440, 1.0, 'sine', 0.05, 0.1);
    } else {
      tone(80, 2.0, 'sawtooth', 0.12);
      tone(110, 1.8, 'sine', 0.1, 0.1);
      tone(55, 2.5, 'sine', 0.08, 0.2);
    }
  }, [tone]);

  /** Sharp dramatic sting */
  const playExecution = useCallback(() => {
    tone(800, 0.08, 'sawtooth', 0.2);
    tone(200, 0.5, 'sawtooth', 0.15, 0.08);
    noiseBurst(0.2, 0.12, 0.05);
  }, [tone, noiseBurst]);

  /** Triumphant short fanfare */
  const playGameOverWin = useCallback(() => {
    tone(440, 0.3, 'triangle', 0.12);
    tone(554, 0.3, 'triangle', 0.12, 0.15);
    tone(659, 0.5, 'triangle', 0.15, 0.3);
    tone(880, 0.8, 'sine', 0.1, 0.5);
  }, [tone]);

  /** Low descending minor chord */
  const playGameOverLoss = useCallback(() => {
    tone(330, 0.8, 'sine', 0.12);
    tone(294, 0.8, 'sine', 0.12, 0.3);
    tone(247, 1.0, 'sine', 0.12, 0.6);
    tone(220, 1.5, 'sine', 0.1, 0.9);
  }, [tone]);

  /** Subtle whoosh */
  const playPhaseTransition = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }, [enabled, getCtx]);

  /** Very soft quill scratch tick */
  const playChatReceived = useCallback(() => {
    noiseBurst(0.04, 0.05);
    tone(2000, 0.03, 'sine', 0.03);
  }, [noiseBurst, tone]);

  return {
    enabled,
    toggle,
    playVoteCast,
    playVoteReveal,
    playEdictEnacted,
    playExecution,
    playGameOverWin,
    playGameOverLoss,
    playPhaseTransition,
    playChatReceived,
  };
}
