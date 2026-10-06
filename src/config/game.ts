import type { ArenaConfig, FighterConfig, RoundEvent, Settings } from '../types';

export const CONFIG = {
  width: 960, height: 620,
  bounds: { left: 105, right: 855, top: 285, bottom: 530 },
  phases: { betting: 22, locked: 3, rumble: 58, results: 8, resurrection: 4 },
  economy: { startingBalance: 10000, minWager: 50, maxWager: 5000, spectatorReward: 150, houseFactor: 0.94 },
  combat: { respawn: 5, invulnerability: 1.2, damageScale: 0.7, randomness: 0.42, bossHealth: 2200, bossDamage: 29, specialCooldown: 9, hazardInterval: 8, difficulty: 1 },
  effects: { particlePool: 250, textPool: 32, projectilePool: 40, shakeDuration: 0.2, transition: 0.45 },
  odds: { min: 1.2, max: 18 },
  events: ['STANDARD RUMBLE', 'DOUBLE REWARDS', 'UNDERDOG BONUS', 'TOKEN SURGE', 'BOSS INVASION', 'SUDDEN DEATH', 'TOKEN CRASH', 'CHAOS MODE', 'NO RESPAWN'] as RoundEvent[],
};
export const DEFAULT_SETTINGS: Settings = { master: 0.45, music: 0.22, effects: 0.5, sound: false, reducedMotion: false, shake: true, particles: 0.7, hazards: true };
export const CLASSES = {
  Assassin: { reach: 43, attackRate: 0.68, retreat: 0.22, special: 'Shadow strike' },
  Brawler: { reach: 44, attackRate: 0.85, retreat: 0.12, special: 'Seismic punch' },
  Tank: { reach: 50, attackRate: 1.15, retreat: 0.08, special: 'Iron pulse' },
  Gunner: { reach: 230, attackRate: 1.08, retreat: 0.42, special: 'Overcharge' },
  Berserker: { reach: 49, attackRate: 0.74, retreat: 0.04, special: 'Blood frenzy' },
  Rogue: { reach: 48, attackRate: 0.71, retreat: 0.32, special: 'Venom edge' },
};
export const WEAPONS: Record<string, { damage: number; critical: number }> = {
  'Plasma katana': { damage: 1.03, critical: 0.05 }, 'Power gauntlets': { damage: 1.08, critical: 0 },
  'Void blades': { damage: 0.98, critical: 0.09 }, 'Railgun': { damage: 1.08, critical: 0.02 },
  'Titan hammer': { damage: 1.16, critical: 0 }, 'Neon daggers': { damage: 0.93, critical: 0.06 },
  'Arc cannon': { damage: 1.05, critical: 0.03 }, 'Inferno axe': { damage: 1.12, critical: 0.01 },
};
export const FIGHTERS: FighterConfig[] = [
  { id: 'byte', name: 'BYTE', title: 'The neon ronin', class: 'Assassin', weapon: 'Plasma katana', color: '#ac83ff', maxHealth: 115, attack: 30, defense: 12, speed: 78, critical: 0.22, dodge: 0.18, aggression: 0.85, wins: 84, losses: 52, kills: 328, deaths: 147, appearance: 0 },
  { id: 'brutus', name: 'BRUTUS', title: 'Built different', class: 'Brawler', weapon: 'Power gauntlets', color: '#ffac5e', maxHealth: 155, attack: 32, defense: 22, speed: 51, critical: 0.14, dodge: 0.06, aggression: 0.93, wins: 72, losses: 58, kills: 302, deaths: 162, appearance: 1 },
  { id: 'void', name: 'VOID', title: 'Out of the shadows', class: 'Rogue', weapon: 'Void blades', color: '#ed75d8', maxHealth: 105, attack: 29, defense: 13, speed: 83, critical: 0.27, dodge: 0.23, aggression: 0.67, wins: 65, losses: 63, kills: 286, deaths: 173, appearance: 2 },
  { id: 'nova', name: 'NOVA', title: 'One shot. No warning.', class: 'Gunner', weapon: 'Railgun', color: '#65d7ed', maxHealth: 100, attack: 27, defense: 9, speed: 59, critical: 0.19, dodge: 0.13, aggression: 0.62, wins: 61, losses: 68, kills: 264, deaths: 156, appearance: 3 },
  { id: 'tank', name: 'TANK', title: 'The last one standing', class: 'Tank', weapon: 'Titan hammer', color: '#b6d57a', maxHealth: 210, attack: 26, defense: 38, speed: 34, critical: 0.08, dodge: 0.03, aggression: 0.8, wins: 58, losses: 73, kills: 213, deaths: 121, appearance: 4 },
  { id: 'kira', name: 'KIRA', title: 'Catch her if you can', class: 'Assassin', weapon: 'Neon daggers', color: '#f57b95', maxHealth: 98, attack: 28, defense: 11, speed: 90, critical: 0.26, dodge: 0.25, aggression: 0.76, wins: 54, losses: 74, kills: 278, deaths: 182, appearance: 5 },
  { id: 'glitch', name: 'GLITCH', title: 'A bug in the system', class: 'Gunner', weapon: 'Arc cannon', color: '#69dfa6', maxHealth: 108, attack: 28, defense: 14, speed: 56, critical: 0.18, dodge: 0.12, aggression: 0.72, wins: 49, losses: 79, kills: 231, deaths: 174, appearance: 6 },
  { id: 'reaper', name: 'REAPER', title: 'No second chances. Mostly.', class: 'Berserker', weapon: 'Inferno axe', color: '#ee705f', maxHealth: 138, attack: 36, defense: 16, speed: 64, critical: 0.2, dodge: 0.08, aggression: 1, wins: 51, losses: 76, kills: 296, deaths: 194, appearance: 7 },
];
export const ARENAS: ArenaConfig[] = [
  { id: 'neon', name: 'Neon District', subtitle: 'ROOFTOPS · SECTOR 07', color: '#bd8bff', hazard: 'Electric surge', hazardDamage: 38, hazardRadius: 68, gravity: 1, favored: 'Assassin', music: 110 },
  { id: 'wasteland', name: 'Wasteland', subtitle: 'THE OUTLANDS · SECTOR 03', color: '#e8a85b', hazard: 'Falling debris', hazardDamage: 45, hazardRadius: 55, gravity: 1, favored: 'Tank', music: 82.4 },
  { id: 'dungeon', name: 'Cyber Dungeon', subtitle: 'UNDERGROUND · LEVEL −09', color: '#e967a5', hazard: 'Laser grid', hazardDamage: 32, hazardRadius: 82, gravity: 1, favored: 'Rogue', music: 73.4 },
  { id: 'moon', name: 'Moon Base', subtitle: 'LUNAR COLONY · BASE 04', color: '#8ad6ef', hazard: 'Meteor strike', hazardDamage: 60, hazardRadius: 48, gravity: 0.68, favored: 'Gunner', music: 130.8 },
  { id: 'forest', name: 'Forest Ruins', subtitle: 'THE OVERGROWTH · ZONE 02', color: '#8ecb79', hazard: 'Spore eruption', hazardDamage: 23, hazardRadius: 95, gravity: 1, favored: 'Brawler', music: 98 },
];
