import { useEffect, useRef } from 'react';
import { ArrowUpRight, AudioLines, BookOpen, ChevronDown, CircleHelp, Settings2, Swords, Users, Wallet } from 'lucide-react';
import { gsap } from 'gsap';
import { Coin, credits } from './Primitives';
import type { Snapshot } from '../types';
export type ModalName = 'fighters' | 'market' | 'history' | 'settings' | 'help' | 'profile' | null;
export function Header({ state, open }: { state: Snapshot; open: (modal: ModalName) => void }) {
  const balance = useRef<HTMLSpanElement>(null), previous = useRef(state.save.balance);
  useEffect(() => {
    const target = balance.current;
    if (!target) return;
    const value = { amount: previous.current };
    const tween = gsap.to(value, { amount: state.save.balance, duration: state.save.settings.reducedMotion ? 0 : 0.65, ease: 'power2.out', onUpdate: () => { target.textContent = credits(value.amount); } });
    previous.current = state.save.balance;
    return () => { tween.kill(); };
  }, [state.save.balance, state.save.settings.reducedMotion]);
  return <header className="site-header">
    <button className="brand" onClick={() => open(null)} aria-label="Pixel Rumble arena"><span className="brand-mark">P<span>R</span></span><span className="brand-type">PIXEL<span>RUMBLE<span className="brand-dot">.</span></span></span></button>
    <nav className="main-nav" aria-label="Main navigation"><button className="nav-link active" onClick={() => open(null)}><Swords size={16}/>Arena</button><button className="nav-link" onClick={() => open('fighters')}><Users size={16}/>Fighters</button><button className="nav-link" onClick={() => open('market')}><AudioLines size={16}/>Market<ArrowUpRight size={12}/></button><button className="nav-link" onClick={() => open('history')}><BookOpen size={15}/>My activity</button></nav>
    <div className="header-right"><span className="simulation-tag">100% FICTIONAL</span><button className="balance-button" onClick={() => open('history')} aria-label={`Balance ${credits(state.save.balance)} RUMBLE Credits. View activity.`}><Coin/><span><span className="balance-label">YOUR BALANCE</span><strong><span className="currency">RC</span> <span ref={balance}>{credits(state.save.balance)}</span></strong></span><ChevronDown size={13}/></button><button className="icon-button help-button" onClick={() => open('help')} aria-label="How to play"><CircleHelp size={19}/></button><button className="icon-button" onClick={() => open('settings')} aria-label="Settings"><Settings2 size={20}/></button><button className="mobile-wallet icon-button" onClick={() => open('history')} aria-label="My activity"><Wallet size={19}/></button></div>
  </header>;
}
