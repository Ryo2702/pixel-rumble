import { Clock3, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { MarketToken } from '../data/readonly/stonkfun/types';
import { formatAge, formatUsd, TokenLogo } from './TokenCard';

export function TokenFeed({ tokens, onSelect, title = 'NEW TOKENS', headingId = 'new-tokens-title', headingMeta = 'SORTED BY NEWEST', emptyText = 'LOADING MARKET...' }: { tokens: MarketToken[]; onSelect: (token: MarketToken) => void; title?: string; headingId?: string; headingMeta?: string; emptyText?: string }) {
  return <section className="new-token-feed" aria-labelledby={headingId}><div className="token-section-heading"><h3 id={headingId}><Sparkles size={14}/>{title}</h3><span><Clock3 size={11}/>{headingMeta}</span></div>{tokens.length ? <div className="new-token-list">{tokens.slice(0, 8).map(token => <motion.button layout key={token.mint} className="new-token-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => onSelect(token)}><TokenLogo token={token} size={28}/><span><b>{token.symbol}</b><small>{token.name}</small></span><strong>{formatUsd(token.market.priceUsd)}</strong><time>{formatAge(token.createdAt)}</time></motion.button>)}</div> : <p className="token-empty">{emptyText}</p>}</section>;
}
