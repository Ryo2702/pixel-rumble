import type { AudienceSave, AudienceSnapshot } from './simulation/types';
import type { LivePredictionHistory, LivePredictionSnapshot, LivePredictionStats, LivePredictionRecord } from './predictions/predictionTypes';
export type FighterClass = 'Assassin' | 'Brawler' | 'Tank' | 'Gunner' | 'Berserker' | 'Rogue';
export type Phase = 'betting' | 'locked' | 'rumble' | 'results' | 'resurrection';
export type EventKind = 'hit' | 'kill' | 'respawn' | 'special' | 'hazard' | 'phase' | 'payout';
export type RoundEvent = 'STANDARD RUMBLE' | 'DOUBLE REWARDS' | 'UNDERDOG BONUS' | 'SUDDEN DEATH' | 'BOSS INVASION' | 'TOKEN CRASH' | 'TOKEN SURGE' | 'CHAOS MODE' | 'NO RESPAWN';
export interface FighterConfig {
  id: string; name: string; title: string; class: FighterClass; weapon: string; color: string;
  maxHealth: number; attack: number; defense: number; speed: number; critical: number; dodge: number; aggression: number;
  wins: number; losses: number; kills: number; deaths: number; appearance: number;
}
export interface Fighter extends FighterConfig {
  health: number; x: number; y: number; facing: number; moving: boolean; cooldown: number; specialCooldown: number;
  respawn: number; attackFlash: number; hurtFlash: number; invulnerable: number; streak: number; longestStreak: number;
  roundKills: number; roundDamage: number; aliveTime: number; odds: number;
  recent: boolean[]; recentDeaths: number; popularity: number; targetId: string | null;
}
export interface ArenaConfig {
  id: string; name: string; subtitle: string; color: string; hazard: string; hazardDamage: number; hazardRadius: number; gravity: number; favored: FighterClass; music: number;
}
export interface Prediction {
  id: string; round: number; fighterId: string; fighterName: string; type: 'winner' | 'team' | 'damage' | 'survival';
  amount: number; odds: number; status: 'pending' | 'won' | 'lost'; payout: number; createdAt: number;
}
export interface Transaction { id: string; label: string; amount: number; time: number; }
export interface Settings { master: number; music: number; effects: number; sound: boolean; reducedMotion: boolean; shake: boolean; particles: number; hazards: boolean; }
export interface SaveData {
  version: 3; balance: number; predictions: Prediction[]; transactions: Transaction[]; settings: Settings; community?: AudienceSave;
  liveStats: LivePredictionStats; liveHistory: LivePredictionHistory[]; liveOpenBets: LivePredictionRecord[];
  discoveries: string[]; achievements: string[]; roundsWatched: number; totalWon: number;
}
export interface FeedItem { id: number; text: string; detail: string; color: string; kind: string; time: number; }
export interface CombatEvent { kind: EventKind; x: number; y: number; color: string; amount?: number; critical?: boolean; text?: string; sourceX?: number; sourceY?: number; ranged?: boolean; fighterId?: string; }
export interface Hazard { x: number; y: number; radius: number; timer: number; active: boolean; }
export interface Boss { health: number; maxHealth: number; x: number; y: number; cooldown: number; hurtFlash: number; }
export interface Snapshot {
  phase: Phase; remaining: number; round: number; arena: ArenaConfig; event: RoundEvent; fighters: Fighter[];
  feed: FeedItem[]; save: Omit<SaveData, 'community'>; audience: AudienceSnapshot; livePredictions: LivePredictionSnapshot; winner: string | null; boss: Boss | null; roundKills: number; speed: number; storageError: boolean;
}
