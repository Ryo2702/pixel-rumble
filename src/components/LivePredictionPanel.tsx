import { useEffect, useRef, useState } from 'react';
import { Clock3, LockKeyhole, Shuffle, Target, Zap } from 'lucide-react';
import { gsap } from 'gsap';
import { motion } from 'motion/react';
import { BET_CONFIG, BET_LIMITS, formatSOL, formatSOLInput, generateRandomBet, parseSOL, payoutFor, profitFor, signedSOL, solToLamports } from '../economy/currency';
import type { GameEngine } from '../game/engine';
import type { LiveBetStatus } from '../predictions/predictionTypes';
import type { Snapshot } from '../types';

function countdown(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `00:${String(whole).padStart(2, '0')}.${String(Math.floor(Math.max(0, seconds) * 100) % 100).padStart(2, '0')}`;
}

export function LivePredictionPanel({ state, engine }: { state: Snapshot; engine: GameEngine }) {
  const market = state.livePredictions.markets[0];
  const [selectionId, setSelectionId] = useState(''), [amount, setAmount] = useState('1.00'), [error, setError] = useState(''), [randomizing, setRandomizing] = useState(false);
  const randomTimer = useRef<ReturnType<typeof setInterval> | null>(null), countdownBar = useRef<HTMLDivElement>(null);
  useEffect(() => () => { if (randomTimer.current) clearInterval(randomTimer.current); }, []);
  useEffect(() => { setSelectionId(market?.selections[0]?.id ?? ''); setError(''); }, [market?.id]);
  useEffect(() => {
    if (!market || market.status !== 'OPEN' || state.save.settings.reducedMotion || !countdownBar.current) return;
    const tween = gsap.fromTo(countdownBar.current, { scaleX: 1 }, { scaleX: 0, duration: Math.max(0.2, market.secondsRemaining), ease: 'none' });
    return () => { tween.kill(); };
  }, [market?.id, state.save.settings.reducedMotion]);
  if (!market || state.phase !== 'rumble' && market.status !== 'RESOLVED') return null;
  const selection = market.selections.find(candidate => candidate.id === selectionId) ?? market.selections[0];
  const open = market.status === 'OPEN';
  const parsedAmount = parseSOL(amount);
  const insufficient = state.save.balance < BET_LIMITS.min;
  const userBet = market.userBet;
  const setBetAmount = (value: number) => { setAmount(formatSOLInput(value)); setError(''); };
  function randomPick() { if (open && market.selections.length) setSelectionId(market.selections[Math.floor(Math.random() * market.selections.length)].id); }
  function randomBet() {
    const next = generateRandomBet({ min: BET_CONFIG.minBet, max: BET_CONFIG.maxBet, balance: state.save.balance });
    if (next === null) { setError('INSUFFICIENT RUMBLE SOL'); return; }
    if (state.save.settings.reducedMotion) { setBetAmount(next); return; }
    if (randomTimer.current) clearInterval(randomTimer.current);
    setRandomizing(true);
    let ticks = 0;
    randomTimer.current = setInterval(() => {
      setBetAmount(generateRandomBet({ min: BET_CONFIG.minBet, max: BET_CONFIG.maxBet, balance: state.save.balance }) ?? next);
      if (++ticks >= 8) { if (randomTimer.current) clearInterval(randomTimer.current); randomTimer.current = null; setBetAmount(next); setRandomizing(false); }
    }, 45);
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selection) return;
    const result = engine.placeLivePrediction(market.id, selection.id, parsedAmount ?? Number.NaN);
    setError(result || '');
  }
  const returnAmount = parsedAmount !== null && selection ? payoutFor(parsedAmount, selection.odds) : 0;
  const secondary = state.livePredictions.markets[1];
  const resultStatus = userBet?.status;
  return <section className="panel live-prediction-panel">
    <div className="panel-heading"><h2><Target size={14}/>LIVE PREDICTION<span className="small-tag">SIMULATED SOL</span></h2><span className={`live-market-status ${open ? 'open' : market.status === 'LOCKED' ? 'locked' : 'resolved'}`}>{open ? <><span className="live-dot"/>OPEN</> : market.status === 'LOCKED' ? <><LockKeyhole size={10}/>LOCKED</> : 'RESULT'}</span></div>
    <div className="live-prediction-body"><div className="live-prediction-question"><span className="eyebrow">{market.kind.replaceAll('_', ' ').toUpperCase()}</span><strong>{market.question}</strong></div>
      <div className="live-selection-list">{market.selections.map(candidate => <button key={candidate.id} type="button" className={`live-selection ${selection?.id === candidate.id ? 'selected' : ''} ${market.outcomeSelectionId === candidate.id ? 'outcome' : ''}`} onClick={() => setSelectionId(candidate.id)} disabled={!open || Boolean(userBet)}><span><i style={{ background: candidate.color }}/>{candidate.label}</span><motion.b key={`${market.id}-${candidate.id}-${candidate.odds}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>{candidate.odds.toFixed(2)}×</motion.b></button>)}</div>
      <div className="live-countdown"><span>{open ? <><Clock3 size={11}/>BETTING CLOSES</> : market.status === 'LOCKED' ? <><LockKeyhole size={11}/>BETTING LOCKED</> : <><Zap size={11}/>RESULT</>}</span><b>{open ? countdown(market.secondsRemaining) : market.outcomeLabel ?? 'WAITING'}</b><i><span ref={countdownBar}/></i></div>
      {userBet ? <div className={`live-user-result ${resultStatus?.toLowerCase()}`} role="status"><strong>{resultStatus === 'OPEN' ? 'PREDICTION PLACED' : resultStatus === 'LOCKED' ? 'ODDS LOCKED' : resultStatus === 'WON' ? 'PREDICTION WON' : resultStatus === 'LOST' ? 'PREDICTION LOST' : `PREDICTION ${resultStatus}`}</strong><span>{userBet.selectionLabel} · {formatSOL(userBet.stake)} @ {userBet.lockedOdds.toFixed(2)}×</span>{isFinal(resultStatus) && <b>{resultStatus === 'WON' ? `${formatSOL(userBet.payout)} returned · ${signedSOL(userBet.payout - userBet.stake)} profit` : resultStatus === 'LOST' ? `LOSS ${formatSOL(userBet.stake)}` : `${formatSOL(userBet.payout)} returned`}</b>}</div> : open ? <form onSubmit={submit}>
        <label className="wager-label" htmlFor="live-wager">BET AMOUNT <span>SIMULATED SOL</span></label><div className="wager-input live-wager-input"><span>SOL</span><input id="live-wager" inputMode="decimal" type="number" min={BET_CONFIG.minBet} max={formatSOLInput(Math.min(BET_LIMITS.max, state.save.balance))} step="0.01" value={amount} onChange={event => { setAmount(event.target.value); setError(''); }} disabled={randomizing} required/></div>
        <div className="quick-amounts live-quick-amounts">{[0.1, 0.5, 1, 5, 10, 20].map(value => <button key={value} type="button" disabled={solToLamports(value) > state.save.balance || randomizing} className={parsedAmount === solToLamports(value) ? 'selected' : ''} onClick={() => setBetAmount(solToLamports(value))}>{value}</button>)}</div>
        <div className="bet-random-actions"><button type="button" disabled={randomizing} onClick={randomPick}><Shuffle size={11}/>RANDOM PICK</button><button type="button" disabled={insufficient || randomizing} onClick={randomBet}><Shuffle size={11}/>RANDOM BET</button></div>
        <div className="potential-return live-potential-return"><span>Potential return<small>Profit {signedSOL(profitFor(parsedAmount ?? 0, selection?.odds ?? 0))}</small></span><strong>{formatSOL(returnAmount)}</strong></div>
        {error && <p className="form-error" role="alert">{error}</p>}{insufficient && <p className="form-error" role="alert">INSUFFICIENT RUMBLE SOL</p>}<button className="primary-button" type="submit" disabled={!selection || insufficient || parsedAmount === null || randomizing}><Target size={15}/>PLACE PREDICTION</button>
      </form> : <div className="live-user-result waiting"><strong>WATCH THE MARKET</strong><span>{market.outcomeLabel ? `RESULT · ${market.outcomeLabel}` : 'No prediction placed.'}</span></div>}
      <div className="live-crowd-summary"><div><span>LIVE CROWD</span><b>{market.audienceCount.toLocaleString()} PREDICTIONS · {formatSOL(market.audienceTotal)}</b></div>{market.distribution.slice(0, 4).map(share => <div className="live-share" key={share.selectionId}><span><i style={{ background: share.color }}/>{share.label}<b>{share.percent.toFixed(0)}%</b></span><i><b style={{ width: `${share.percent}%`, background: share.color }}/></i></div>)}</div>
      {secondary && <div className="live-secondary-market"><span className="eyebrow">NEXT MARKET</span><strong>{secondary.question}</strong><small>{secondary.status === 'OPEN' ? `CLOSES ${countdown(secondary.secondsRemaining)}` : secondary.status}</small></div>}
    </div>
  </section>;
}

function isFinal(status: LiveBetStatus | undefined): boolean {
  return ['WON', 'LOST', 'PUSH', 'VOID', 'EXPIRED'].includes(String(status));
}
