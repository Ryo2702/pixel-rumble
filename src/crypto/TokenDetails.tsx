import { Check, Copy, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { SOLANA_MAINNET_LABEL } from '../data/readonly/solana/types';
import { isSolanaAddress } from '../data/readonly/solana/validation';
import type { MarketToken } from '../data/readonly/stonkfun/types';
import { formatCompactUsd, formatUsd, shortAddress, TokenLogo } from './TokenCard';

function Detail({ label, value }: { label: string; value: string | undefined }) {
  return value === undefined ? null : <div><span>{label}</span><strong>{value}</strong></div>;
}

function supplyValue(raw: string | undefined, decimals: number | undefined) {
  if (raw === undefined || decimals === undefined) return raw;
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, '0');
  const point = padded.length - decimals;
  return `${padded.slice(0, point)}.${padded.slice(point)}`.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
}

export function TokenDetails({ token, lastUpdated, close }: { token: MarketToken; lastUpdated: number | null; close: () => void }) {
  const [copied, setCopied] = useState(false);
  const onChain = token.onChain;
  const verified = onChain?.status === 'verified';
  const explorerUrl = isSolanaAddress(token.mint) ? `https://explorer.solana.com/address/${encodeURIComponent(token.mint)}?cluster=mainnet-beta` : undefined;
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
  return <aside className="token-details-panel" aria-label={`${token.name} token details`}><div className="token-details-heading"><div><TokenLogo token={token} size={46}/><span><b>{token.name}</b><small>{token.symbol}</small></span></div><button className="icon-button" onClick={close} aria-label="Close token details"><X size={17}/></button></div><span className="small-tag">{verified ? 'VERIFIED ON-CHAIN' : onChain?.status === 'unavailable' ? 'ON-CHAIN DATA UNAVAILABLE' : 'UNVERIFIED'}</span><div className="token-details-value"><span>REAL MARKET PRICE</span><strong>{formatUsd(token.market.priceUsd)}</strong></div><div className="token-details-grid"><Detail label="MARKET CAP" value={formatCompactUsd(token.market.marketCapUsd)}/><Detail label="FDV" value={formatCompactUsd(token.market.fdvUsd)}/><Detail label="LIQUIDITY" value={formatCompactUsd(token.market.liquidityUsd)}/><Detail label="24H VOLUME" value={formatCompactUsd(token.market.volume24hUsd)}/><Detail label="NETWORK" value={SOLANA_MAINNET_LABEL}/><Detail label="PROGRAM" value={verified ? onChain?.program : undefined}/><Detail label="SUPPLY" value={verified ? supplyValue(onChain?.supplyRaw, onChain?.decimals) : undefined}/><Detail label="DECIMALS" value={verified && onChain?.decimals !== undefined ? String(onChain.decimals) : undefined}/><Detail label="POOL" value={shortAddress(token.pool)}/><Detail label="STATUS" value={verified ? 'VERIFIED ON-CHAIN' : onChain?.status === 'unavailable' ? 'ON-CHAIN DATA UNAVAILABLE' : 'UNVERIFIED'}/><Detail label="CREATED" value={new Date(token.createdAt).toLocaleString()}/><Detail label="LAST UPDATED" value={onChain?.checkedAt ? new Date(onChain.checkedAt).toLocaleString() : lastUpdated ? new Date(lastUpdated).toLocaleString() : undefined}/></div><div className="token-address"><span>MINT</span><code title={token.mint}>{token.mint}</code>{navigator.clipboard && <button onClick={() => void copyAddress()}>{copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? 'COPIED' : 'COPY ADDRESS'}</button>}</div>{explorerUrl && <a className="token-explorer-link" href={explorerUrl} target="_blank" rel="noopener noreferrer">VIEW ON SOLANA EXPLORER <ExternalLink size={12}/></a>}<p className="token-disclaimer">Token associations in Pixel Rumble are generated for gameplay and do not imply sponsorship or endorsement.</p></aside>;
}
