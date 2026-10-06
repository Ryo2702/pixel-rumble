import type { Personality } from '../simulation/types';
import { solToLamports } from '../economy/currency';

export const AUDIENCE = {
  population: 3200, seed: 7041992, baseWatchers: 2480, tickSeconds: 0.25,
  betsPerSecond: 52, maxBetsPerTick: 32, largeBet: solToLamports(18), maxFeed: 12, maxReactions: 24,
  historyDays: 7, crowdInfluence: 0.65, crowdOddsLimit: 0.18, renderedCrowd: 76,
  personalities: ['conservative', 'conservative', 'conservative', 'trend', 'trend', 'underdog', 'underdog', 'random', 'random', 'high-roller'] as Personality[],
  behavior: {
    conservative: { min: solToLamports(0.1), max: solToLamports(2), participation: 0.85 },
    'high-roller': { min: solToLamports(5), max: solToLamports(20), participation: 0.32 },
    underdog: { min: solToLamports(2), max: solToLamports(15), participation: 0.9 },
    trend: { min: solToLamports(0.5), max: solToLamports(8), participation: 0.95 },
    random: { min: solToLamports(0.5), max: solToLamports(8), participation: 0.75 },
  },
  knownNames: ['PixelKing92', 'VoidHunter', 'CryptoNeko', 'ByteSlayer', 'NeonWolf', 'GhostTrader', 'ZeroCool', 'MoonBrawler', 'Rogue404', 'NightByte'],
  prefixes: ['Pixel', 'Neon', 'Void', 'Ghost', 'Moon', 'Cyber', 'Zero', 'Night', 'Laser', 'Retro', 'Turbo', 'Shadow', 'Glitch', 'Quantum', 'Arcade', 'Static', 'Chrome', 'Nova', 'Rogue', 'Cosmic', 'Solar', 'Byte', 'Lunar', 'Flux', 'Velvet', 'Crimson', 'Jade', 'Golden', 'Electric', 'Violet', 'Binary', 'Echo', 'Iron', 'Plasma', 'Midnight', 'Frost', 'Amber', 'Chaos', 'Rust', 'Hyper'],
  suffixes: ['Wolf', 'Neko', 'Knight', 'Pilot', 'King', 'Queen', 'Hunter', 'Slayer', 'Trader', 'Runner', 'Fox', 'Cat', 'Panda', 'Tiger', 'Raven', 'Owl', 'Brawler', 'Ninja', 'Ronin', 'Rider', 'Drifter', 'Witch', 'Wizard', 'Ghost', 'Sprite', 'Warden', 'Nomad', 'Oracle', 'Bandit', 'Mantis', 'Raptor', 'Rebel', 'Kid', 'Sage', 'Phantom', 'Falcon', 'Jester', 'Specter', 'Samurai', 'Dreamer'],
  colors: ['#ae8cf5', '#6cdae5', '#eca86f', '#e879bb', '#91cc82', '#f0d26c', '#749be8', '#ee858c'],
};
