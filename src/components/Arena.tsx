import { useEffect, useRef, useState } from 'react';
import { Expand, Radio, Skull, Volume2, VolumeX, Zap } from 'lucide-react';
import { gsap } from 'gsap';
import { CONFIG } from '../config/game';
import type { GameEngine } from '../game/engine';
import type { Snapshot } from '../types';
import type { createArena } from '../game/renderer';
import { Avatar } from './Primitives';

export function Arena({ state, engine, selected, select }: { state: Snapshot; engine: GameEngine; selected: string; select: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null), frame = useRef<HTMLElement>(null), announcement = useRef<HTMLDivElement>(null);
  const renderer = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const [loaded, setLoaded] = useState(false), [error, setError] = useState('');
  const latestSelect = useRef(select); latestSelect.current = select;
  useEffect(() => {
    let cancelled = false;
    import('../game/renderer').then(({ createArena }) => createArena(host.current!, engine, id => latestSelect.current(id))).then(instance => {
      if (cancelled) { instance.destroy(); return; }
      renderer.current = instance; setLoaded(true);
    }).catch(() => { if (!cancelled) setError('The arena could not initialize. Enable hardware acceleration and reload to try again.'); });
    return () => { cancelled = true; renderer.current?.destroy(); renderer.current = null; };
  }, [engine]);
  useEffect(() => { renderer.current?.select(selected); }, [selected]);
  useEffect(() => {
    if (!announcement.current || state.save.settings.reducedMotion) return;
    const tween = gsap.fromTo(announcement.current, { opacity: 0, y: 8, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)' });
    return () => { tween.kill(); };
  }, [state.phase, state.save.settings.reducedMotion]);
  function toggleAudio() { engine.setSettings({ sound: !state.save.settings.sound }); renderer.current?.sound(); }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await frame.current?.requestFullscreen(); } catch { setError('Fullscreen is unavailable in this browser.'); } }
  const winner = state.fighters.find(f => f.id === state.winner);
  const phaseLabels = { betting: 'PREDICTIONS OPEN', locked: 'GET READY', rumble: 'LIVE RUMBLE', results: 'ROUND COMPLETE', resurrection: 'RECONSTRUCTING' };
  const progress = Math.max(0, Math.min(100, state.remaining / CONFIG.phases[state.phase] * 100));
  return <section className="arena-panel" ref={frame}>
    <div className="arena-heading"><div><Radio size={15}/><h2>LIVE ARENA</h2><span className="arena-divider"/><span className="arena-round">ROUND {String(state.round).padStart(3, '0')}</span></div><div><button className="icon-button" onClick={toggleAudio} aria-label={state.save.settings.sound ? 'Mute audio' : 'Enable audio'}>{state.save.settings.sound ? <Volume2 size={16}/> : <VolumeX size={16}/>}</button><button className="icon-button" onClick={fullscreen} aria-label="Fullscreen arena"><Expand size={15}/></button></div></div>
    <div className="arena-screen"><div className="pixi-host" ref={host}/><div className="crt-overlay"/><div className="arena-location"><span className="location-cross">⌖</span><div><strong>{state.arena.name.toUpperCase()}</strong><small>{state.arena.subtitle}</small></div></div><div className="arena-live-pill"><span className="live-dot"/>{state.phase === 'rumble' ? 'LIVE' : 'ON AIR'}</div>
      {!loaded && <div className="arena-loading"><span className="loading-pixel"/><strong>{error || 'BOOTING THE UNDERGROUND...'}</strong>{error && <button onClick={() => window.location.reload()}>Retry</button>}</div>}
      {loaded && <div ref={announcement} className={`arena-announcement phase-${state.phase}`} key={state.phase}>
        {state.phase === 'betting' && <><span className="announcement-kicker">THE CALM BEFORE THE CHAOS</span><strong>MAKE YOUR CALL<span>_</span></strong><small>Predictions close in <b>{state.remaining}s</b></small></>}
        {state.phase === 'locked' && <><span className="announcement-kicker">PREDICTIONS LOCKED</span><strong className="countdown">{state.remaining}</strong><small>LET THEM FIGHT.</small></>}
        {state.phase === 'results' && winner && <><span className="announcement-kicker">{state.boss ? state.boss.health <= 0 ? 'THE FIGHTERS WIN' : 'THE OVERLORD WINS' : 'YOUR ROUND CHAMPION'}</span><Avatar fighter={winner} size={66}/><strong style={{ color: winner.color }}>{winner.name}</strong><small>{state.boss ? `${Math.round(winner.roundDamage)} damage · top fighter` : `${winner.roundKills} ELIMINATIONS · ${Math.round(winner.roundDamage)} DAMAGE`}</small></>}
        {state.phase === 'resurrection' && <><span className="announcement-kicker">DEATH IS JUST A LOADING SCREEN</span><strong>RISE. RUMBLE. REPEAT.</strong><small>Reconstructing fighters...</small></>}
      </div>}
      {state.boss && state.phase === 'rumble' && <div className="boss-health"><span>THE OVERLORD <b>{Math.ceil(state.boss.health)} / {state.boss.maxHealth}</b></span><div><i style={{ width: `${state.boss.health / state.boss.maxHealth * 100}%` }}/></div></div>}
      {state.event !== 'STANDARD RUMBLE' && <div className="arena-event"><Zap size={12}/>{state.event}</div>}
      <div className="arena-corner-info"><span>● AUTO-BATTLE</span><span>NO MERCY. NO PERMADEATH.</span></div>
    </div>
    <div className="arena-controls"><span className={`phase-indicator ${state.phase}`}><span className="live-dot"/>{phaseLabels[state.phase]}</span><div className="round-timer"><span>{Math.floor(state.remaining / 60).toString().padStart(2, '0')}:{(state.remaining % 60).toString().padStart(2, '0')}</span><div className="timer-track"><i style={{ width: `${progress}%` }}/></div></div><button className="speed-button" onClick={() => engine.setSpeed(state.speed === 1 ? 1.5 : state.speed === 1.5 ? 2 : 1)} aria-label={`Simulation speed ${state.speed} times. Click to change.`}>{state.speed.toFixed(1)}×</button></div>
    <div className="arena-bottom"><span><span className="lime">{state.fighters.filter(f => f.health > 0).length.toString().padStart(2, '0')}</span> / 08 ALIVE</span><span><Skull size={12}/><b>{state.roundKills}</b> ELIMINATIONS</span><span><Zap size={12}/> {state.arena.hazard.toUpperCase()}</span></div>
  </section>;
}
