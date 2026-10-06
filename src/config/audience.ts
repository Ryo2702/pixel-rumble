import type { Personality } from '../simulation/types';

export const AUDIENCE = {
  population: 3200, seed: 7041992, baseWatchers: 2480, tickSeconds: 0.25,
  betsPerSecond: 52, maxBetsPerTick: 32, largeBet: 2500, maxFeed: 12, maxReactions: 24,
  historyDays: 7, crowdInfluence: 0.65, crowdOddsLimit: 0.18, renderedCrowd: 76,
  personalities: ['conservative', 'conservative', 'conservative', 'trend', 'trend', 'underdog', 'underdog', 'random', 'random', 'high-roller'] as Personality[],
  behavior: {
    conservative: { min: 25, max: 200, participation: 0.85 },
    'high-roller': { min: 2500, max: 15000, participation: 0.32 },
    underdog: { min: 50, max: 550, participation: 0.9 },
    trend: { min: 75, max: 700, participation: 0.95 },
    random: { min: 20, max: 900, participation: 0.75 },
  },
  knownNames: ['PixelKing92', 'VoidHunter', 'CryptoNeko', 'ByteSlayer', 'NeonWolf', 'GhostTrader', 'ZeroCool', 'MoonBrawler', 'Rogue404', 'NightByte'],
  prefixes: ['Pixel', 'Neon', 'Void', 'Ghost', 'Moon', 'Cyber', 'Zero', 'Night', 'Laser', 'Retro', 'Turbo', 'Shadow', 'Glitch', 'Quantum', 'Arcade', 'Static', 'Chrome', 'Nova', 'Rogue', 'Cosmic', 'Solar', 'Byte', 'Lunar', 'Flux', 'Velvet', 'Crimson', 'Jade', 'Golden', 'Electric', 'Violet', 'Binary', 'Echo', 'Iron', 'Plasma', 'Midnight', 'Frost', 'Amber', 'Chaos', 'Rust', 'Hyper'],
  suffixes: ['Wolf', 'Neko', 'Knight', 'Pilot', 'King', 'Queen', 'Hunter', 'Slayer', 'Trader', 'Runner', 'Fox', 'Cat', 'Panda', 'Tiger', 'Raven', 'Owl', 'Brawler', 'Ninja', 'Ronin', 'Rider', 'Drifter', 'Witch', 'Wizard', 'Ghost', 'Sprite', 'Warden', 'Nomad', 'Oracle', 'Bandit', 'Mantis', 'Raptor', 'Rebel', 'Kid', 'Sage', 'Phantom', 'Falcon', 'Jester', 'Specter', 'Samurai', 'Dreamer'],
  colors: ['#ae8cf5', '#6cdae5', '#eca86f', '#e879bb', '#91cc82', '#f0d26c', '#749be8', '#ee858c'],
};
