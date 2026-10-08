import { Check, Copy, ExternalLink, LogOut, WalletCards, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWallet, type SupportedWalletName, type WalletOption } from '../wallet/WalletProvider';

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function WalletMark({ option }: { option: WalletOption }) {
  if (option.icon) return <img className="wallet-option-icon" src={option.icon} alt="" />;
  return <span className={`wallet-option-icon wallet-fallback-${option.name.toLowerCase()}`} aria-hidden="true">{option.name[0]}</span>;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy unavailable');
  }
}

export function WalletButton() {
  const { options, connection, status, error, connect, disconnect, clearError } = useWallet();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'select' | 'account'>('select');
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const busy = status === 'connecting' || status === 'disconnecting';

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    return () => window.clearTimeout(copyTimer.current);
  }, [open]);

  useEffect(() => {
    if (!connection && view === 'account') setView('select');
  }, [connection, view]);

  const openDialog = () => {
    clearError();
    setCopied(false);
    setView(connection ? 'account' : 'select');
    setOpen(true);
  };

  const selectWallet = async (name: SupportedWalletName) => {
    const connected = await connect(name);
    if (connected) setView('account');
  };

  const copyAddress = async () => {
    if (!connection) return;
    try {
      await copyText(connection.account.address);
      setCopied(true);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      clearError();
    }
  };

  return <>
    <button className={`wallet-trigger ${connection ? 'wallet-trigger-connected' : ''}`} onClick={openDialog} aria-haspopup="dialog" aria-expanded={open} aria-label={connection ? `Wallet connected: ${shortenAddress(connection.account.address)}` : 'Connect wallet'}>
      {connection ? <><WalletMark option={options.find(option => option.name === connection.wallet.name) ?? options[0]}/><span className="wallet-trigger-text"><small>WALLET</small><strong>{shortenAddress(connection.account.address)}</strong></span></> : <><WalletCards size={16}/><span>CONNECT WALLET</span></>}
    </button>
    <dialog ref={dialog} className="wallet-dialog" onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} aria-labelledby="wallet-dialog-title">
      <div className="wallet-dialog-inner">
        <header className="wallet-dialog-header"><div><span className="eyebrow">PIXEL RUMBLE / SOLANA</span><h2 id="wallet-dialog-title">{view === 'account' ? 'WALLET CONNECTED' : 'SELECT WALLET'}</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close wallet dialog"><X size={20}/></button></header>
        {view === 'account' && connection ? <div className="wallet-account-view">
          <div className="wallet-account-card"><WalletMark option={options.find(option => option.name === connection.wallet.name) ?? options[0]}/><div><span className="wallet-account-label">CONNECTED WITH {connection.wallet.name.toUpperCase()}</span><code>{connection.account.address}</code></div></div>
          <div className="wallet-account-actions"><button className="wallet-action" onClick={() => void copyAddress()}><>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'COPIED' : 'COPY ADDRESS'}</></button><button className="wallet-action wallet-action-danger" onClick={() => void disconnect()} disabled={busy}><LogOut size={15}/>{status === 'disconnecting' ? 'DISCONNECTING' : 'DISCONNECT WALLET'}</button></div>
          <button className="wallet-change" onClick={() => { clearError(); setView('select'); }}>Change wallet</button>
        </div> : <div className="wallet-select-view">
          <p className="wallet-dialog-description">Connect with a Solana wallet to view your public address. This app never asks for private keys, recovery phrases, signatures, or transactions.</p>
          <div className="wallet-options">{options.map(option => option.wallet ? <button className="wallet-option" key={option.name} onClick={() => void selectWallet(option.name)} disabled={busy}><WalletMark option={option}/><span className="wallet-option-copy"><strong>{option.name}</strong><small>{status === 'connecting' ? 'OPENING WALLET…' : 'AVAILABLE'}</small></span><ExternalLink size={14}/></button> : <a className="wallet-option wallet-option-unavailable" key={option.name} href={option.url} target="_blank" rel="noreferrer"><WalletMark option={option}/><span className="wallet-option-copy"><strong>{option.name}</strong><small>NOT INSTALLED · INSTALL</small></span><ExternalLink size={14}/></a>)}</div>
          {error && <p className="wallet-error" role="alert">{error}</p>}
          <p className="wallet-security-note"><span className="live-dot"/> CONNECTION ONLY · NO SIGNING OR TRANSACTIONS</p>
        </div>}
      </div>
    </dialog>
  </>;
}
