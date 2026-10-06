import { useState } from 'react';
import { ChevronRight, Crown, Flame, Skull, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Avatar } from './Primitives';
import type { Fighter, Phase } from '../types';

export function Leaderboard({ fighters, selected, select, inspect, phase }: { fighters: Fighter[]; selected: string; select: (id: string) => void; inspect: (id: string) => void; phase: Phase }) {
  const [sort, setSort] = useState<'kills' | 'wins'>('kills');
  const ranked = [...fighters].sort((a, b) => b[sort] - a[sort]);
  return <aside className="panel roster-panel">
    <div className="panel-heading"><h2><SwordsIcon/>THE FIGHTERS</h2><span className="count-badge">08</span></div>
    <div className="roster-tabs" role="tablist" aria-label="Fighter rankings"><button role="tab" aria-selected={sort === 'kills'} className={sort === 'kills' ? 'selected' : ''} onClick={() => setSort('kills')}><Skull size={13}/>Kills</button><button role="tab" aria-selected={sort === 'wins'} className={sort === 'wins' ? 'selected' : ''} onClick={() => setSort('wins')}><Trophy size={13}/>Wins</button></div>
    <div className="roster-label"><span>FIGHTER</span><span>{sort.toUpperCase()}</span></div>
    <div className="fighter-list">{ranked.map((fighter, index) => <motion.button key={fighter.id} whileTap={{ scale: 0.98 }} className={`fighter-row ${selected === fighter.id ? 'chosen' : ''} ${fighter.health <= 0 ? 'fighter-dead' : ''}`} onClick={() => select(fighter.id)} onDoubleClick={() => inspect(fighter.id)} aria-label={`Select ${fighter.name}, ${fighter.class}, ${fighter[sort]} ${sort}`} aria-pressed={selected === fighter.id}>
      <span className={`rank rank-${index}`}>{index === 0 ? <Crown size={13}/> : String(index + 1).padStart(2, '0')}</span><Avatar fighter={fighter} size={36}/><span className="fighter-identity"><strong style={{ color: selected === fighter.id ? fighter.color : undefined }}>{fighter.name}</strong><small>{fighter.health <= 0 ? `Respawn ${Math.ceil(fighter.respawn)}s` : fighter.class}</small></span><span className="fighter-score">{fighter[sort]}{fighter.streak >= 2 && <span className="streak"><Flame size={10}/>{fighter.streak}</span>}</span>
    </motion.button>)}</div>
    <div className="roster-summary"><span className="live-dot"/><span>{phase === 'rumble' ? `${fighters.filter(f => f.health > 0).length} fighters alive` : 'All fighters ready'}</span><span>FREE-FOR-ALL</span></div>
    <button className="text-button roster-explore" onClick={() => inspect(selected)}>Fighter dossier<ChevronRight size={14}/></button>
  </aside>;
}
function SwordsIcon() { return <span className="tiny-cross" aria-hidden="true">✛</span>; }
