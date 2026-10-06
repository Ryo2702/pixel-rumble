import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock3, Info, LockKeyhole, Shield, Sparkles, Swords, Target, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { CONFIG } from '../config/game';
import { quotedOdds } from '../economy/predictions';
import { Avatar, Coin } from './Primitives';
import { BET_CONFIG, BET_LIMITS, formatSOL, formatSOLInput, generateRandomBet, parseSOL, payoutFor, profitFor, signedSOL, solToLamports } from '../economy/currency';
import { LiveBets } from './AudiencePanels';
import { LivePredictionPanel } from './LivePredictionPanel';
import type { GameEngine } from '../game/engine';
import type { Fighter, Prediction, Snapshot } from '../types';

export function PredictionPanel({ state, fighter, engine, select, inspect }: { state: Snapshot; fighter: Fighter; engine: GameEngine; select: (id: string) => void; inspect: () => void }) {
  const [amount, setAmount] = useState('1.00'), [error, setError] = useState(''), [randomizing, setRandomizing] = useState(false);
  const [type, setType] = useState<Prediction['type']>('winner'), [team, setTeam] = useState('fighters');
  const randomTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (randomTimer.current) clearInterval(randomTimer.current); }, []);
  const pending = state.save.predictions.find(p => p.round === state.round);
  const isBoss = state.event === 'BOSS INVASION';
  const actualType = isBoss ? type : 'winner';
  const odds = pending?.odds ?? quotedOdds(actualType === 'team' ? team === 'boss' ? 2.4 : 1.65 : actualType === 'winner' ? fighter.odds : 7.2, state.event);
  const betting = state.phase === 'betting';
  const parsedAmount = parseSOL(amount);
  const insufficient = state.save.balance < BET_LIMITS.min;
  const setBetAmount = (value: number) => { setAmount(formatSOLInput(value)); setError(''); };
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = engine.placePrediction(actualType === 'team' ? team : fighter.id, parsedAmount ?? Number.NaN, actualType);
    setError(result || '');
  }
  function randomPick() {
    const eligible = state.fighters.filter(candidate => candidate.health > 0);
    if (eligible.length) select(eligible[Math.floor(Math.random() * eligible.length)].id);
  }
  function randomBet() {
    const next = generateRandomBet({ min: BET_CONFIG.minBet, max: BET_CONFIG.maxBet, balance: state.save.balance });
    if (next === null) { setError('INSUFFICIENT RUMBLE SOL'); return; }
    if (state.save.settings.reducedMotion) { setBetAmount(next); return; }
    if (randomTimer.current) clearInterval(randomTimer.current);
    setRandomizing(true);
    let ticks = 0;
    randomTimer.current = setInterval(() => {
      setBetAmount(generateRandomBet({ min: BET_CONFIG.minBet, max: BET_CONFIG.maxBet, balance: state.save.balance }) ?? next);
      ticks++;
      if (ticks >= 8) {
        if (randomTimer.current) clearInterval(randomTimer.current);
        randomTimer.current = null;
        setBetAmount(next);
        setRandomizing(false);
      }
    }, 45);
  }
  const potentialReturn = parsedAmount === null ? 0 : payoutFor(parsedAmount, odds);
  return <aside className="prediction-column">
    <LivePredictionPanel state={state} engine={engine}/>
    <section className="panel prediction-panel"><div className="panel-heading"><h2><Target size={15}/>MAKE YOUR CALL</h2><Info size={14} className="muted"/></div>
      <motion.div key={betting ? 'open' : 'locked'} initial={{ opacity: 0.5, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`betting-status ${betting ? 'is-open' : ''}`}><span><span className="live-dot"/>{betting ? 'PREDICTIONS OPEN' : state.phase === 'results' ? 'ROUND COMPLETE' : 'BETTING LOCKED'}</span><span>{betting ? <><Clock3 size={12}/><motion.b key={state.remaining} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>{state.remaining}s</motion.b></> : <LockKeyhole size={12}/>}</span></motion.div>
      <div className="selected-fighter"><Avatar fighter={fighter} size={55}/><div><span className="eyebrow">YOUR CONTENDER</span><button className="selected-name" onClick={inspect}>{fighter.name}<ChevronDown size={15}/></button><small style={{ color: fighter.color }}>{fighter.class} <span>· {fighter.weapon}</span></small></div></div>
      <label className="fighter-select-label"><span className="sr-only">Choose fighter</span><select aria-label="Choose fighter" value={fighter.id} onChange={e => select(e.target.value)}>{state.fighters.map(f => <option key={f.id} value={f.id}>{f.name} · {f.odds.toFixed(2)}×</option>)}</select><ChevronDown size={12}/></label>
      <div className="fighter-mini-stats"><span><Swords size={13}/>ATK <b>{fighter.attack}</b></span><span><Shield size={13}/>DEF <b>{fighter.defense}</b></span><span><Zap size={13}/>SPD <b>{fighter.speed}</b></span></div>
      <div className="odds-row"><div><span className="eyebrow">WIN RATE</span><strong>{Math.round(fighter.wins / (fighter.wins + fighter.losses) * 100)}<small>%</small></strong></div><div><span className="eyebrow">{pending ? 'YOUR LOCKED ODDS' : 'PAYOUT MULTIPLIER'}</span><motion.strong key={odds} initial={{ color: '#fff' }} animate={{ color: '#d6f65c' }} className="lime">{odds.toFixed(2)}<small>×</small></motion.strong></div></div>
      {isBoss && <div className="boss-prediction"><label>Prediction type<select value={type} onChange={e => setType(e.target.value as Prediction['type'])}><option value="winner">Top fighter</option><option value="team">Winning side</option><option value="damage">Most boss damage</option><option value="survival">Longest survivor</option></select></label>{type === 'team' && <select aria-label="Winning side" value={team} onChange={e => setTeam(e.target.value)}><option value="fighters">The fighters · 1.65×</option><option value="boss">The Overlord · 2.40×</option></select>}</div>}
      {pending ? <div className={`confirmed-prediction ${pending.status}`} role="status"><span className="confirmed-icon"><Check size={20}/></span><strong>{pending.status === 'pending' ? "YOU'RE IN." : pending.status === 'won' ? 'NICE CALL.' : 'NEXT ROUND. NEW CHANCE.'}</strong><span className="eyebrow">CURRENT BET</span><p>{pending.fighterName} · {formatSOL(pending.amount)} at {pending.odds.toFixed(2)}×</p><span>{pending.status === 'pending' ? `Potential return ${formatSOL(payoutFor(pending.amount, pending.odds))}` : pending.status === 'won' ? `${signedSOL(pending.payout - pending.amount)} profit` : `${signedSOL(-pending.amount)} · next round, new chance`}</span></div> : <form onSubmit={submit}>
        <label className="wager-label" htmlFor="wager">BET AMOUNT <span>SIMULATED SOL</span></label>
        <motion.div className="wager-input" animate={randomizing ? { scale: [1, 1.03, 1], borderColor: ['#444651', '#d6f65c', '#444651'] } : { scale: 1 }} transition={{ duration: 0.3 }}><span>SOL</span><input id="wager" inputMode="decimal" type="number" min={BET_CONFIG.minBet} max={formatSOLInput(Math.min(BET_LIMITS.max, state.save.balance))} step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setError(''); }} disabled={!betting || randomizing} required aria-describedby={error ? 'wager-error' : undefined}/><Coin small/></motion.div>
        <div className="quick-amounts" aria-label="Quick bet amounts">{[0.1, 0.5, 1, 5, 10, 20].map(value => <button key={value} type="button" disabled={!betting || solToLamports(value) > state.save.balance} className={parsedAmount === solToLamports(value) ? 'selected' : ''} onClick={() => setBetAmount(solToLamports(value))}>{value}</button>)}<button type="button" disabled={!betting || insufficient} onClick={() => setBetAmount(Math.min(BET_LIMITS.max, state.save.balance))}>MAX</button></div>
        <div className="bet-random-actions"><button type="button" disabled={!betting} onClick={randomPick}>RANDOM PICK</button><button type="button" disabled={!betting || insufficient || randomizing} onClick={randomBet}>RANDOM BET</button></div>
        <p className="wager-limits">MIN {formatSOL(BET_LIMITS.min)} · MAX {formatSOL(BET_LIMITS.max)}</p>
        <div className="potential-return"><span>Potential return <Info size={11}/><small>Profit {signedSOL(profitFor(parsedAmount ?? 0, odds))}</small></span><strong>{formatSOL(potentialReturn)}</strong></div>
        {error && <p className="form-error" id="wager-error" role="alert">{error}</p>}
        {insufficient && <p className="form-error" role="alert">INSUFFICIENT RUMBLE SOL</p>}
        <motion.button whileHover={{ filter: 'brightness(1.08)' }} whileTap={{ scale: 0.98 }} className="primary-button" type="submit" disabled={!betting || insufficient || parsedAmount === null}>{betting ? <><Target size={16}/>PLACE BET</> : <><LockKeyhole size={15}/>WAITING FOR NEXT ROUND</>}</motion.button>
      </form>}
      <p className="fictional-note"><Shield size={11}/>SIMULATED SOL · Never withdrawable or paid on-chain.</p>
    </section>
    <div className="spectator-perk"><span className="perk-icon"><Sparkles size={18}/></span><div><strong>GOOD THINGS COME TO WATCHERS.</strong><p>Earn <b>{formatSOL(CONFIG.economy.spectatorReward)} simulated SOL</b> for every completed round.</p></div></div>
    <LiveBets audience={state.audience}/>
  </aside>;
}
