import { motion } from 'motion/react';
import { SOLANA_NETWORK, type MarketToken } from '../data/readonly/stonkfun/types';

export function formatUsd(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 0.01 ? 8 : 4 }).format(value);
}

export function formatCompactUsd(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

export function formatAge(createdAt: string) {
  const age = Math.max(0, Date.now() - Date.parse(createdAt));
  if (age < 30000) return 'NEW';
  if (age < 60000) return `${Math.floor(age / 1000)}s`;
  const minutes = Math.floor(age / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

export function networkName(network: string) {
  return network === SOLANA_NETWORK ? 'SOLANA' : network;
}

export function TokenLogo({ token, size = 38 }: { token: MarketToken; size?: number }) {
  return token.imageUrl ? <img className="token-logo" src={token.imageUrl} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"/> : <span className="token-logo-fallback" style={{ width: size, height: size }}>{token.symbol.slice(0, 2).toUpperCase()}</span>;
}

export function TokenCard({ token, onSelect }: { token: MarketToken; onSelect: (token: MarketToken) => void }) {
  const onChainLabel = token.onChain?.status === 'verified' ? 'VERIFIED' : token.onChain?.status === 'unavailable' ? 'ON-CHAIN N/A' : 'UNVERIFIED';
  return <motion.article className="crypto-market-card token-card" layout whileHover={{ y: -2 }}>
    <button className="token-card-button" onClick={() => onSelect(token)} aria-label={`Inspect ${token.name} ${token.symbol}`}>
      <div className="crypto-card-title"><TokenLogo token={token}/><div><h3>{token.name}</h3><span>{token.symbol}</span></div><span className="small-tag">{onChainLabel}</span></div>
      <strong>{formatUsd(token.market.priceUsd)}</strong>
      {token.changePercent === undefined ? <span className="token-muted">CHANGE N/A <small>until next refresh</small></span> : <span className={token.changePercent >= 0 ? 'positive' : 'negative'}>{token.changePercent >= 0 ? '↑' : '↓'} {Math.abs(token.changePercent).toFixed(2)}% <small>since last update</small></span>}
      <div className="token-stats">{token.market.marketCapUsd !== undefined && <span>MARKET CAP <b>{formatCompactUsd(token.market.marketCapUsd)}</b></span>}{token.market.liquidityUsd !== undefined && <span>LIQUIDITY <b>{formatCompactUsd(token.market.liquidityUsd)}</b></span>}{token.market.volume24hUsd !== undefined && <span>24H VOLUME <b>{formatCompactUsd(token.market.volume24hUsd)}</b></span>}</div>
      <p className="token-card-meta"><span>{networkName(token.network)}</span><span>{formatAge(token.createdAt)}</span></p>
    </button>
  </motion.article>;
}
