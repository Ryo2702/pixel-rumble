import { Activity, ArrowUpRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { StonkFunMarketState } from '../data/readonly/stonkfun/store';
import type { MarketToken } from '../data/readonly/stonkfun/types';
import { LaunchablePairs } from './LaunchablePairs';
import { TokenCard } from './TokenCard';
import { TokenDetails } from './TokenDetails';
import { TokenFeed } from './TokenFeed';
import { TokenTicker } from './TokenTicker';

function updatedAt(value: number | null) {
  return value ? new Date(value).toLocaleTimeString('en-US', { hour12: false }) : '—';
}

function EmptyMarket({ market, compact = false }: { market: StonkFunMarketState; compact?: boolean }) {
  if (market.status === 'loading') return <span className={compact ? 'market-inline-status' : 'token-empty'}>LOADING MARKET...</span>;
  return <span className={compact ? 'market-inline-status' : 'market-error'}><strong>REAL SOLANA DATA TEMPORARILY UNAVAILABLE</strong><button onClick={() => void market.refresh()}>RETRY</button></span>;
}

export function MarketTicker({ market, open }: { market: StonkFunMarketState; open: () => void }) {
  const select = (_token: MarketToken) => open();
  return <section className="crypto-strip" aria-label="Real Solana read-only market"><div className="crypto-strip-label"><Activity size={15}/><strong>REAL SOLANA<br/>DATA</strong><span>READ ONLY</span></div>{market.tokens.length ? <TokenTicker tokens={market.tokens} onSelect={select}/> : <EmptyMarket market={market} compact/>}<div className="market-last-updated">LAST UPDATED<br/><b>{updatedAt(market.lastUpdated)}</b></div><button className="market-strip-open" onClick={open} aria-label="View market"><ArrowUpRight size={15}/></button></section>;
}

export function MarketView({ market }: { market: StonkFunMarketState }) {
  const [selected, setSelected] = useState<MarketToken | null>(null);
  const visibleTokens = market.tokens.slice(0, 5);
  const verifiedTokens = market.tokens.filter(token => token.onChain?.status === 'verified');
  return <><div className="market-notice"><ShieldCheck size={22}/><div><strong>REAL SOLANA DATA · READ ONLY</strong><p>POWERED BY STONKFUN + SOLANA MAINNET. StonkFun discovers tokens; Solana Mainnet verifies public mint accounts. Game events and simulated SOL never alter on-chain data.</p></div><span className="market-updated">LAST UPDATED<br/><b>{updatedAt(market.lastUpdated)}</b></span></div>{market.status === 'error' && <div className="market-error"><strong>REAL SOLANA DATA TEMPORARILY UNAVAILABLE</strong><span>{market.error}</span><button onClick={() => void market.refresh()}><RefreshCw size={13}/>RETRY</button></div>}{market.tokens.length ? <><TokenFeed tokens={market.tokens} onSelect={setSelected}/><TokenFeed tokens={verifiedTokens} onSelect={setSelected} title="VERIFIED TOKENS" headingId="verified-tokens-title" headingMeta="SOLANA MAINNET · READ ONLY" emptyText="NO VERIFIED TOKENS YET."/><div className="crypto-market-cards">{visibleTokens.map(token => <TokenCard key={token.mint} token={token} onSelect={setSelected}/>)}</div>{selected && <TokenDetails token={selected} lastUpdated={market.lastUpdated} close={() => setSelected(null)}/>}</> : market.status !== 'error' && <EmptyMarket market={market}/>}<LaunchablePairs pairs={market.pairs} error={market.pairsError} retry={() => void market.refresh()}/><p className="dialog-description">Pixel Rumble uses simulated SOL for spectator predictions. The Rumble Exchange only displays read-only public Solana data.</p></>;
}

export { TokenCard, TokenDetails, TokenFeed, LaunchablePairs, TokenTicker };
