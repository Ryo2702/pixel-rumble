import { lazy, Suspense, useCallback, useState, useSyncExternalStore } from 'react';
import { ChevronRight, Sparkles, Swords } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { GameEngine } from './game/engine';
import { Header } from './components/Header';
import type { ModalName } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { PredictionPanel } from './components/PredictionPanel';
import { Arena } from './components/Arena';
import { LivePanels } from './components/LivePanels';
import { MarketTicker } from './crypto/CryptoMarket';
import { CrowdHUD } from './components/AudiencePanels';
import { useStonkFunMarket } from './services/stonkfun/store';

const Dialogs = lazy(() => import('./components/Dialogs').then(module => ({ default: module.Dialogs })));

export default function App() {
  const [engine] = useState(() => {
    const game = new GameEngine();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) game.setSettings({ reducedMotion: true });
    return game;
  });
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const market = useStonkFunMarket();
  const [selected, setSelected] = useState('byte'), [modal, setModal] = useState<ModalName>(null);
  const [mobileTab, setMobileTab] = useState('prediction');
  const select = useCallback((id: string) => { setSelected(id); engine.discover(id); }, [engine]);
  const inspect = useCallback((id: string) => { select(id); setModal('profile'); }, [select]);
  const fighter = state.fighters.find(f => f.id === selected)!;
  return <MotionConfig reducedMotion={state.save.settings.reducedMotion ? 'always' : 'user'}><div className={`app-shell ${state.save.settings.reducedMotion ? 'reduced-motion' : ''}`}>
    <Header state={state} open={setModal}/>
    <main id="main-content" tabIndex={-1}><div className="page-intro"><div><div className="intro-eyebrow"><span/>SEASON 01 <span className="slash">/</span> THE UNDERGROUND</div><h1><span className="sr-only">Pixel Rumble: </span>ENTER THE <span>CHAOS.</span><span className="title-cross">✦</span></h1><p>Pick a fighter. Trust your gut. Watch it all unfold.</p></div><div className="intro-right"><CrowdHUD audience={state.audience}/></div></div>
      {state.storageError && <div className="save-warning" role="alert">Device storage is unavailable. Your game works, but progress cannot be saved.</div>}
      <div className="mobile-panel-tabs"><button className={mobileTab === 'prediction' ? 'selected' : ''} onClick={() => setMobileTab('prediction')}><Swords size={15}/>Make a prediction</button><button className={mobileTab === 'fighters' ? 'selected' : ''} onClick={() => setMobileTab('fighters')}>Fighters<ChevronRight size={14}/></button></div>
      <div className={`game-grid mobile-show-${mobileTab}`}><Leaderboard fighters={state.fighters} selected={selected} select={select} inspect={inspect} phase={state.phase} audience={state.audience}/><Arena state={state} engine={engine} selected={selected} select={inspect}/><PredictionPanel state={state} fighter={fighter} engine={engine} select={select} inspect={() => inspect(selected)}/></div>
      <MarketTicker market={market} open={() => setModal('market')}/>
      <LivePanels state={state} tokens={market.tokens} openLeaderboard={() => setModal('leaderboard')}/>
      <div className="arena-manifesto"><span className="manifesto-symbol">✛</span><p>FIGHT. FALL. <span>RESPAWN.</span> REPEAT.</p><span className="manifesto-line"/><span><Sparkles size={12}/>A LITTLE CHAOS IS GOOD FOR YOU.</span></div>
    </main>
    {modal && <Suspense fallback={<div className="panel-loading" role="status">Loading panel…</div>}><Dialogs name={modal} close={() => setModal(null)} state={state} selected={selected} engine={engine} market={market} select={id => { select(id); setModal('profile'); }}/></Suspense>}
  </div></MotionConfig>;
}
