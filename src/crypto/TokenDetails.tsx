import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';
import type { MarketToken } from '../services/stonkfun/types';
import { formatCompactUsd, formatUsd, networkName, shortAddress, TokenLogo } from './TokenCard';

function Detail({ label, value }: { label: string; value: string | undefined }) {
  return value === undefined ? null : <div><span>{label}</span><strong>{value}</strong></div>;
}

export function TokenDetails({ token, lastUpdated, close }: { token: MarketToken; lastUpdated: number | null; close: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copyAddress() {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(token.mint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return <aside className="token-details-panel" aria-label={`${token.name} token details`}><div className="token-details-heading"><div><TokenLogo token={token} size={46}/><span><b>{token.name}</b><small>{token.symbol}</small></span></div><button className="icon-button" onClick={close} aria-label="Close token details"><X size={17}/></button></div><span className="small-tag">REAL MARKET DATA</span><div className="token-details-value"><span>PRICE</span><strong>{formatUsd(token.market.priceUsd)}</strong></div><div className="token-details-grid"><Detail label="MARKET CAP" value={formatCompactUsd(token.market.marketCapUsd)}/><Detail label="FDV" value={formatCompactUsd(token.market.fdvUsd)}/><Detail label="LIQUIDITY" value={formatCompactUsd(token.market.liquidityUsd)}/><Detail label="24H VOLUME" value={formatCompactUsd(token.market.volume24hUsd)}/><Detail label="NETWORK" value={networkName(token.network)}/><Detail label="POOL" value={shortAddress(token.pool)}/><Detail label="STATUS" value={token.status}/><Detail label="CREATED" value={new Date(token.createdAt).toLocaleString()}/><Detail label="LAST UPDATED" value={lastUpdated ? new Date(lastUpdated).toLocaleString() : undefined}/></div><div className="token-address"><span> TOKEN ADDRESS</span><code>{shortAddress(token.mint)}</code>{navigator.clipboard && <button onClick={() => void copyAddress()}>{copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? 'COPIED' : 'COPY ADDRESS'}</button>}</div><p className="token-disclaimer">Token associations in Pixel Rumble are generated for gameplay and do not imply sponsorship or endorsement.</p></aside>;
}
