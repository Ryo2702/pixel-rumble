import { useState } from 'react';
import { Check, ChevronDown, Clock3, Info, LockKeyhole, Shield, Sparkles, Swords, Target, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { CONFIG } from '../config/game';
import { quotedOdds } from '../economy/predictions';
import { Avatar, Coin, credits } from './Primitives';
import type { GameEngine } from '../game/engine';
import type { Fighter, Prediction, Snapshot } from '../types';

export function PredictionPanel({ state, fighter, engine, select, inspect }: { state: Snapshot; fighter: Fighter; engine: GameEngine; select: (id: string) => void; inspect: () => void }) {
  const [amount, setAmount] = useState('500'), [error, setError] = useState('');
  const [type, setType] = useState<Prediction['type']>('winner'), [team, setTeam] = useState('fighters');
  const pending = state.save.predictions.find(p => p.round === state.round);
  const isBoss = state.event === 'BOSS INVASION';
  const actualType = isBoss ? type : 'winner';
  const odds = quotedOdds(actualType === 'team' ? team === 'boss' ? 2.4 : 1.65 : actualType === 'winner' ? fighter.odds : 7.2, state.event);
  const betting = state.phase === 'betting';
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = engine.placePrediction(actualType === 'team' ? team : fighter.id, Number(amount), actualType);
    setError(result || '');
  }
  return <aside className="prediction-column">
    <section className="panel prediction-panel"><div className="panel-heading"><h2><Target size={15}/>MAKE YOUR CALL</h2><Info size={14} className="muted"/></div>
      <div className={`betting-status ${betting ? 'is-open' : ''}`}><span><span className="live-dot"/>{betting ? 'PREDICTIONS OPEN' : state.phase === 'results' ? 'ROUND COMPLETE' : 'PREDICTIONS LOCKED'}</span><span>{betting ? <><Clock3 size={12}/>{state.remaining}s</> : <LockKeyhole size={12}/>}</span></div>
      <div className="selected-fighter"><Avatar fighter={fighter} size={55}/><div><span className="eyebrow">YOUR CONTENDER</span><button className="selected-name" onClick={inspect}>{fighter.name}<ChevronDown size={15}/></button><small style={{ color: fighter.color }}>{fighter.class} <span>· {fighter.weapon}</span></small></div></div>
      <label className="fighter-select-label"><span className="sr-only">Choose fighter</span><select aria-label="Choose fighter" value={fighter.id} onChange={e => select(e.target.value)}>{state.fighters.map(f => <option key={f.id} value={f.id}>{f.name} · {f.odds.toFixed(2)}×</option>)}</select><ChevronDown size={12}/></label>
      <div className="fighter-mini-stats"><span><Swords size={13}/>ATK <b>{fighter.attack}</b></span><span><Shield size={13}/>DEF <b>{fighter.defense}</b></span><span><Zap size={13}/>SPD <b>{fighter.speed}</b></span></div>
      <div className="odds-row"><div><span className="eyebrow">WIN RATE</span><strong>{Math.round(fighter.wins / (fighter.wins + fighter.losses) * 100)}<small>%</small></strong></div><div><span className="eyebrow">PAYOUT MULTIPLIER</span><strong className="lime">{odds.toFixed(2)}<small>×</small></strong></div></div>
      {isBoss && <div className="boss-prediction"><label>Prediction type<select value={type} onChange={e => setType(e.target.value as Prediction['type'])}><option value="winner">Top fighter</option><option value="team">Winning side</option><option value="damage">Most boss damage</option><option value="survival">Longest survivor</option></select></label>{type === 'team' && <select aria-label="Winning side" value={team} onChange={e => setTeam(e.target.value)}><option value="fighters">The fighters · 1.65×</option><option value="boss">The Overlord · 2.40×</option></select>}</div>}
      {pending ? <div className={`confirmed-prediction ${pending.status}`} role="status"><span className="confirmed-icon"><Check size={20}/></span><strong>{pending.status === 'pending' ? "YOU'RE IN." : pending.status === 'won' ? 'NICE CALL.' : 'NEXT ROUND. NEW CHANCE.'}</strong><p>{pending.fighterName} · RC {credits(pending.amount)} at {pending.odds.toFixed(2)}×</p><span>{pending.status === 'pending' ? `Potential return RC ${credits(pending.amount * pending.odds)}` : pending.status === 'won' ? `+RC ${credits(pending.payout)} returned` : 'Your wager was lost. The next round opens soon.'}</span></div> : <form onSubmit={submit}>
        <label className="wager-label" htmlFor="wager">YOUR PREDICTION <span>Fictional credits</span></label>
        <div className="wager-input"><span>RC</span><input id="wager" inputMode="numeric" type="number" min={CONFIG.economy.minWager} max={Math.min(CONFIG.economy.maxWager, state.save.balance)} step="1" value={amount} onChange={e => { setAmount(e.target.value); setError(''); }} disabled={!betting} required aria-describedby={error ? 'wager-error' : undefined}/><Coin small/></div>
        <div className="quick-amounts">{[100, 500, 1000].map(value => <button key={value} type="button" disabled={!betting} className={Number(amount) === value ? 'selected' : ''} onClick={() => { setAmount(String(value)); setError(''); }}>{credits(value)}</button>)}<button type="button" disabled={!betting} onClick={() => setAmount(String(Math.min(CONFIG.economy.maxWager, state.save.balance)))}>MAX</button></div>
        <div className="potential-return"><span>Potential return <Info size={11}/></span><strong>RC {credits(Math.max(0, Number(amount) || 0) * odds)}</strong></div>
        {error && <p className="form-error" id="wager-error" role="alert">{error}</p>}
        <motion.button whileHover={{ filter: 'brightness(1.08)' }} whileTap={{ scale: 0.98 }} className="primary-button" type="submit" disabled={!betting || state.save.balance < CONFIG.economy.minWager}>{betting ? <><Target size={16}/>LOCK IN PREDICTION</> : <><LockKeyhole size={15}/>WAITING FOR NEXT ROUND</>}</motion.button>
      </form>}
      <p className="fictional-note"><Shield size={11}/>Just for the thrill. No real money. Ever.</p>
    </section>
    <div className="spectator-perk"><span className="perk-icon"><Sparkles size={18}/></span><div><strong>GOOD THINGS COME TO WATCHERS.</strong><p>Earn <b>RC 150</b> for every completed round.</p></div></div>
  </aside>;
}
