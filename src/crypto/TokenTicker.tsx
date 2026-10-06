import { ArrowDown, ArrowUp, ArrowUpRight } from 'lucide-react';
import type { MarketToken } from '../services/stonkfun/types';
import { formatUsd } from './TokenCard';

export function TokenTicker({ tokens, onSelect }: { tokens: MarketToken[]; onSelect: (token: MarketToken) => void }) {
  return <div className="ticker-tokens">{tokens.slice(0, 5).map(token => <button key={token.mint} onClick={() => onSelect(token)}><b>{token.symbol}</b><span>{formatUsd(token.market.priceUsd)}</span>{token.changePercent === undefined ? <small>N/A</small> : <small className={token.changePercent >= 0 ? 'positive' : 'negative'}>{token.changePercent >= 0 ? <ArrowUp size={9}/> : <ArrowDown size={9}/>} {Math.abs(token.changePercent).toFixed(2)}%</small>}<ArrowUpRight size={10}/></button>)}</div>;
}
