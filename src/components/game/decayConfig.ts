export type CrackIntensity = 'none' | 'hairline' | 'moderate' | 'severe' | 'broken' | 'shattered';
export type FlickerSpeed = 'calm' | 'uneasy' | 'agitated' | 'violent' | 'dying';
export type AshDensity = 'none' | 'sparse' | 'moderate' | 'heavy';
export type AmbientGlow = 'none' | 'ember' | 'fire' | 'inferno';

export interface DecayStageConfig {
  stage: number;
  borderCrackIntensity: CrackIntensity;
  goldSaturation: number;       // 1.0 → 0.0
  goldHueShift: number;         // degrees offset from base gold
  vignetteIntensity: number;    // 0.0 → 1.0
  candleFlickerSpeed: FlickerSpeed;
  ashParticleDensity: AshDensity;
  ashParticleCount: number;
  crimsonBleed: number;         // 0.0 → 1.0
  watermarkOpacity: number;     // 0.0 → 0.15
  ambientGlow: AmbientGlow;
  backgroundDarken: number;     // additional darkening 0.0 → 0.3
}

export const DECAY_STAGES: DecayStageConfig[] = [
  // Stage 0 — Pristine
  {
    stage: 0,
    borderCrackIntensity: 'none',
    goldSaturation: 1.0,
    goldHueShift: 0,
    vignetteIntensity: 0.0,
    candleFlickerSpeed: 'calm',
    ashParticleDensity: 'none',
    ashParticleCount: 0,
    crimsonBleed: 0.0,
    watermarkOpacity: 0.0,
    ambientGlow: 'none',
    backgroundDarken: 0,
  },
  // Stage 1 — First Cracks
  {
    stage: 1,
    borderCrackIntensity: 'hairline',
    goldSaturation: 0.9,
    goldHueShift: -2,
    vignetteIntensity: 0.08,
    candleFlickerSpeed: 'calm',
    ashParticleDensity: 'none',
    ashParticleCount: 0,
    crimsonBleed: 0.0,
    watermarkOpacity: 0.0,
    ambientGlow: 'none',
    backgroundDarken: 0.02,
  },
  // Stage 2 — Spreading Fractures
  {
    stage: 2,
    borderCrackIntensity: 'moderate',
    goldSaturation: 0.75,
    goldHueShift: -5,
    vignetteIntensity: 0.18,
    candleFlickerSpeed: 'uneasy',
    ashParticleDensity: 'none',
    ashParticleCount: 0,
    crimsonBleed: 0.0,
    watermarkOpacity: 0.0,
    ambientGlow: 'none',
    backgroundDarken: 0.05,
  },
  // Stage 3 — The Rot Sets In
  {
    stage: 3,
    borderCrackIntensity: 'severe',
    goldSaturation: 0.5,
    goldHueShift: -10,
    vignetteIntensity: 0.3,
    candleFlickerSpeed: 'agitated',
    ashParticleDensity: 'sparse',
    ashParticleCount: 6,
    crimsonBleed: 0.12,
    watermarkOpacity: 0.0,
    ambientGlow: 'ember',
    backgroundDarken: 0.1,
  },
  // Stage 4 — Kingdom in Crisis
  {
    stage: 4,
    borderCrackIntensity: 'broken',
    goldSaturation: 0.3,
    goldHueShift: -15,
    vignetteIntensity: 0.45,
    candleFlickerSpeed: 'violent',
    ashParticleDensity: 'moderate',
    ashParticleCount: 12,
    crimsonBleed: 0.3,
    watermarkOpacity: 0.04,
    ambientGlow: 'fire',
    backgroundDarken: 0.15,
  },
  // Stage 5 — The Ruin
  {
    stage: 5,
    borderCrackIntensity: 'shattered',
    goldSaturation: 0.1,
    goldHueShift: -20,
    vignetteIntensity: 0.6,
    candleFlickerSpeed: 'dying',
    ashParticleDensity: 'heavy',
    ashParticleCount: 18,
    crimsonBleed: 0.5,
    watermarkOpacity: 0.1,
    ambientGlow: 'fire',
    backgroundDarken: 0.22,
  },
  // Stage 6 — Total Collapse
  {
    stage: 6,
    borderCrackIntensity: 'shattered',
    goldSaturation: 0.0,
    goldHueShift: -25,
    vignetteIntensity: 0.8,
    candleFlickerSpeed: 'dying',
    ashParticleDensity: 'heavy',
    ashParticleCount: 20,
    crimsonBleed: 0.7,
    watermarkOpacity: 0.15,
    ambientGlow: 'inferno',
    backgroundDarken: 0.3,
  },
];
