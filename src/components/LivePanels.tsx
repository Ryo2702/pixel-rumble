import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, ChevronRight, Radio, RefreshCw, Skull, TrendingUp, Trophy, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar, Sparkline } from './Primitives';
import type { FeedItem, Fighter, Snapshot } from '../types';

export function MarketTicker({ fighters, open }: { fighters: Fighter[]; open: () => void }) {
  return <div className="market-ticker"><button className="ticker-label" onClick={open}><Activity size={13}/><span>RUMBLE EXCHANGE</span><span className="ticker-sim">SIM</span></button><div className="ticker-tokens">{fighters.slice(0, 6).map(f => <button key={f.id} onClick={open}><b>${f.token}</b><span>{f.price.toFixed(2)} <small>RC</small></span><span className={f.change >= 0 ? 'positive' : 'negative'}>{f.change >= 0 ? '+' : ''}{f.change.toFixed(2)}%</span><Sparkline values={f.priceHistory} color={f.change >= 0 ? '#95dbaa' : '#ef7d8a'} width={38} height={17}/></button>)}</div><span className="ticker-disclaimer">FICTIONAL MARKET</span></div>;
}
const feedIcon = (kind: string) => kind === 'kill' ? Skull : kind === 'respawn' ? RefreshCw : kind === 'winner' ? Trophy : kind === 'payout' ? TrendingUp : kind === 'streak' ? Zap : Radio;
function FeedRow({ item }: { item: FeedItem }) {
  const Icon = feedIcon(item.kind);
  return <motion.div className="feed-row" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><span className="feed-icon" style={{ color: item.color }}><Icon size={14}/></span><div><strong>{item.text}</strong><span>{item.detail}</span></div><time>{new Date(item.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></motion.div>;
}
export function LivePanels({ state, openMarket }: { state: Snapshot; openMarket: () => void }) {
  const [feedFilter, setFeedFilter] = useState('all');
  const feed = state.feed.filter(f => feedFilter === 'all' || ['prediction', 'payout'].includes(f.kind));
  const movers = [...state.fighters].sort((a, b) => b.change - a.change).slice(0, 4);
  return <div className="under-grid"><section className="panel activity-panel"><div className="panel-heading"><h2><Radio size={14}/>THE LIVE FEED<span className="live-dot"/></h2><div className="feed-tabs"><button className={feedFilter === 'all' ? 'selected' : ''} onClick={() => setFeedFilter('all')}>All events</button><button className={feedFilter === 'mine' ? 'selected' : ''} onClick={() => setFeedFilter('mine')}>My calls</button></div></div><div className="feed-list"><AnimatePresence initial={false}>{feed.slice(0, 4).map(item => <FeedRow item={item} key={item.id}/>)}</AnimatePresence>{feed.length === 0 && <div className="empty-state"><Activity size={22}/><strong>Your story starts with a prediction.</strong><span>Lock in a call when the next round opens.</span></div>}</div></section>
    <section className="panel movers-panel"><div className="panel-heading"><h2><TrendingUp size={15}/>FIGHTER TOKENS<span className="small-tag">SIMULATED</span></h2><button className="text-button" onClick={openMarket}>View market<ChevronRight size={13}/></button></div><div className="market-table"><div className="market-table-head"><span>ASSET</span><span>TREND</span><span>PRICE / RC</span><span>THIS ROUND</span></div>{movers.map(f => <button className="market-table-row" key={f.id} onClick={openMarket}><span><Avatar fighter={f} size={29}/><b>${f.token}</b></span><Sparkline values={f.priceHistory} color={f.change >= 0 ? '#95dbaa' : '#ef7d8a'} width={84} height={24}/><strong>{f.price.toFixed(2)}</strong><span className={f.change >= 0 ? 'positive' : 'negative'}>{f.change >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {Math.abs(f.change).toFixed(2)}%</span></button>)}</div><div className="market-footnote"><span className="live-dot"/>Prices move with the fight. All values are fictional.</div></section></div>;
}
