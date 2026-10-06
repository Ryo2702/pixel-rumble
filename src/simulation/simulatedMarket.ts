import { MARKET_ASSETS } from '../config/audience';
import { SeededRandom } from './spectatorGenerator';
import type { AudienceSignal, MarketQuote } from './types';

export interface MarketDataProvider { readonly source: 'simulated' | 'real-read-only'; getQuotes(): readonly MarketQuote[]; }
// Read-only integration seam: a future external feed can implement this, independently of betting.
export interface RealMarketReadOnlyProvider extends MarketDataProvider { readonly source: 'real-read-only'; }
export class SimulatedMarketProvider implements MarketDataProvider {
  readonly source = 'simulated' as const;
  private quotes: MarketQuote[];
  private clock = 0;
  private impulse = 0;
  private momentum = MARKET_ASSETS.map(() => 0);
  private random: SeededRandom;
  constructor(seed: number, stored?: MarketQuote[]) {
    this.random = new SeededRandom(seed ^ 0x6a09e667);
    this.quotes = MARKET_ASSETS.map(asset => {
      const old = stored?.find(q => q && q.symbol === asset.symbol);
      if (old && [old.price, old.open, old.change, old.volume].every(Number.isFinite) && old.price > 0 && old.open > 0 && Array.isArray(old.history) && old.history.every(v => Number.isFinite(v) && v > 0)) return { ...old, name: asset.name, color: asset.color, history: old.history.slice(-40) };
      const history = Array.from({ length: 40 }, (_, i) => asset.price * (1 + Math.sin(i * 0.6) * 0.008 + (i - 39) * 0.00015));
      return { symbol: asset.symbol, name: asset.name, color: asset.color, price: asset.price, open: history[0], change: (asset.price / history[0] - 1) * 100, history: [...history.slice(0, -1), asset.price], volume: 100000 + this.random.next() * 5000000 };
    });
  }
  signal(event: AudienceSignal) {
    const direction = event.event === 'TOKEN CRASH' ? -1 : 1;
    if (['kill', 'streak', 'winner', 'upset', 'boss', 'open'].includes(event.kind)) this.impulse = Math.max(-0.006, Math.min(0.006, this.impulse + direction * (event.kind === 'upset' || event.event?.startsWith('TOKEN') ? 0.004 : 0.0005)));
  }
  update(dt: number) {
    this.clock += dt;
    if (this.clock < 1) return;
    this.clock -= 1;
    const tide = (this.random.next() - 0.5) * 0.001 + this.impulse;
    this.impulse *= 0.7;
    this.quotes.forEach((quote, i) => {
      this.momentum[i] = this.momentum[i] * 0.72 + (this.random.next() - 0.5) * MARKET_ASSETS[i].volatility + tide;
      const meanReversion = Math.log(MARKET_ASSETS[i].price / quote.price) * 0.002;
      quote.price = Math.max(0.0001, quote.price * Math.exp(Math.max(-0.015, Math.min(0.015, this.momentum[i] + meanReversion))));
      quote.change = (quote.price / quote.open - 1) * 100;
      quote.volume += Math.round(100 + this.random.next() * 3000);
      quote.history.push(quote.price); quote.history = quote.history.slice(-40);
    });
  }
  getQuotes(): MarketQuote[] { return this.quotes.map(quote => ({ ...quote, history: [...quote.history] })); }
}
