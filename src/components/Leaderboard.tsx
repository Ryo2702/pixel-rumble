import { useState } from 'react';
import { ChevronRight, Crown, Flame, LockKeyhole, Skull, Trophy, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar } from './Primitives';
import { money } from '../economy/money';
import type { Fighter, Phase } from '../types';
import type { AudienceSnapshot } from '../simulation/types';

export function Leaderboard({ fighters, selected, select, inspect, phase, audience }: { fighters: Fighter[]; selected: string; select: (id: string) => void; inspect: (id: string) => void; phase: Phase; audience: AudienceSnapshot }) {
  const [sort, setSort] = useState<'kills' | 'wins' | 'crowd'>('crowd');
  const shares = new Map(audience.distribution.map(s => [s.fighterId, s]));
  const ranked = [...fighters].sort((a, b) => sort === 'crowd' ? (shares.get(b.id)?.amount ?? 0) - (shares.get(a.id)?.amount ?? 0) : b[sort] - a[sort]);
  return <aside className="panel roster-panel crowd-roster">
    <div className="panel-heading"><h2><span className="tiny-cross">✛</span>FIGHTERS & ODDS</h2><span className="count-badge">08</span></div>
    <div className="roster-tabs" role="tablist" aria-label="Fighter rankings">{(['crowd', 'kills', 'wins'] as const).map(tab => <button key={tab} role="tab" aria-selected={sort === tab} className={sort === tab ? 'selected' : ''} onClick={() => setSort(tab)}>{tab === 'crowd' ? <Users size={12}/> : tab === 'kills' ? <Skull size={12}/> : <Trophy size={12}/>} {tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>
    <div className="crowd-distribution-heading"><span>CROWD PREDICTION</span><span>{audience.locked ? <><LockKeyhole size={9}/>LOCKED</> : <><span className="live-dot"/>LIVE</>}</span></div>
    <div className="fighter-list">{ranked.map((fighter, index) => { const share = shares.get(fighter.id); return <motion.button key={fighter.id} whileTap={{ scale: 0.98 }} className={`fighter-row ${selected === fighter.id ? 'chosen' : ''} ${fighter.health <= 0 ? 'fighter-dead' : ''}`} onClick={() => select(fighter.id)} onDoubleClick={() => inspect(fighter.id)} aria-label={`Select ${fighter.name}, ${fighter.class}, ${fighter.odds.toFixed(2)} times odds, ${share?.percent.toFixed(1) ?? 0} percent crowd support`} aria-pressed={selected === fighter.id}>
      <span className={`rank rank-${index}`}>{index === 0 ? <Crown size={12}/> : String(index + 1).padStart(2, '0')}</span><Avatar fighter={fighter} size={33}/><span className="fighter-identity"><strong style={{ color: selected === fighter.id ? fighter.color : undefined }}>{fighter.name}</strong><small>{fighter.health <= 0 ? `Respawn ${Math.ceil(fighter.respawn)}s` : sort === 'crowd' ? fighter.class : `${fighter[sort]} ${sort}`}</small></span><span className="fighter-score">{fighter.odds.toFixed(2)}<small>×</small>{fighter.streak >= 2 && <span className="streak"><Flame size={10}/>{fighter.streak}</span>}</span>
      <span className="crowd-fighter-distribution"><span className="crowd-bar"><motion.i animate={{ width: `${share?.percent ?? 0}%` }} transition={{ duration: 0.35 }} style={{ background: fighter.color }}/></span><span>{share?.percent.toFixed(1) ?? '0.0'}% <b>{money(share?.amount ?? 0)}</b></span></span>
    </motion.button>; })}</div>
    {audience.distribution.filter(s => ['boss', 'fighters'].includes(s.fighterId)).map(share => <div className="boss-crowd-share" key={share.fighterId}><span>{share.name}</span><b>{share.percent.toFixed(1)}%</b><small>{money(share.amount)}</small></div>)}
    <div className="roster-summary"><span className="live-dot"/><span>{phase === 'rumble' ? `${fighters.filter(f => f.health > 0).length} fighters alive` : 'All fighters ready'}</span><span>SIMULATED CROWD</span></div>
    <button className="text-button roster-explore" onClick={() => inspect(selected)}>Fighter dossier<ChevronRight size={14}/></button>
  </aside>;
}
