import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowUpRight, AudioLines, BookOpen, ChevronDown, CircleHelp, Crown, Settings2, Swords, Users } from 'lucide-react';
import { gsap } from 'gsap';
import { Coin } from './Primitives';
import { formatSOL, signedSOL } from '../economy/currency';
import { AnimatePresence, motion } from 'motion/react';
import type { Snapshot } from '../types';
import { WalletButton } from './WalletButton';
export type ModalName = 'fighters' | 'market' | 'history' | 'settings' | 'help' | 'profile' | 'leaderboard' | null;
export function Header({ state, open }: { state: Snapshot; open: (modal: ModalName) => void }) {
  const balance = useRef<HTMLSpanElement>(null), previous = useRef(state.save.balance);
  const [delta, setDelta] = useState<{ amount: number; id: number } | null>(null);
  useEffect(() => {
    const target = balance.current;
    if (!target) return;
    const value = { amount: previous.current };
    if (previous.current !== state.save.balance) setDelta({ amount: state.save.balance - previous.current, id: Date.now() });
    const timer = window.setTimeout(() => setDelta(null), 2600);
    const tween = gsap.to(value, { amount: state.save.balance, duration: state.save.settings.reducedMotion ? 0 : 0.65, ease: 'power2.out', onUpdate: () => { target.textContent = formatSOL(Math.round(value.amount)); } });
    previous.current = state.save.balance;
    return () => { tween.kill(); window.clearTimeout(timer); };
  }, [state.save.balance, state.save.settings.reducedMotion]);
  return <header className="site-header">
    <button className="brand" onClick={() => open(null)} aria-label="Pixel Rumble arena"><span className="brand-mark">P<span>R</span></span><span className="brand-type">PIXEL<span>RUMBLE<span className="brand-dot">.</span></span></span></button>
    <nav className="main-nav" aria-label="Main navigation"><button className="nav-link active" onClick={() => open(null)}><Swords size={16}/>Arena</button><button className="nav-link" onClick={() => open('help')}><CircleHelp size={15}/>How It Works</button><button className="nav-link" onClick={() => open('fighters')}><Users size={16}/>Fighters</button><button className="nav-link" onClick={() => open('market')}><AudioLines size={16}/>Market<ArrowUpRight size={12}/></button><button className="nav-link" onClick={() => open('leaderboard')}><Crown size={15}/>Rankings</button><button className="nav-link" onClick={() => open('history')}><BookOpen size={15}/>My activity</button></nav>
    <div className="header-right"><span className="header-live"><span className="live-dot"/>{state.audience.watchers.toLocaleString()}<small>LIVE · IN-GAME</small></span><button className="balance-button" onClick={() => open('history')} aria-label={`Rumble balance ${formatSOL(state.save.balance)} simulated SOL. View activity.`}><Coin/><span><span className="balance-label">RUMBLE BALANCE · SIMULATED SOL</span><strong><span ref={balance}>{formatSOL(state.save.balance)}</span></strong></span><ChevronDown size={13}/><AnimatePresence>{delta && <motion.span key={delta.id} className={`balance-delta ${delta.amount >= 0 ? 'positive' : 'negative'}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="status">{signedSOL(delta.amount)}</motion.span>}</AnimatePresence></button><WalletButton/><button className="icon-button help-button" onClick={() => open('help')} aria-label="How It Works"><CircleHelp size={19}/></button><button className="icon-button" onClick={() => open('settings')} aria-label="Settings"><Settings2 size={20}/></button><button className="mobile-activity icon-button" onClick={() => open('history')} aria-label="My activity"><Activity size={19}/></button></div>
  </header>;
}
