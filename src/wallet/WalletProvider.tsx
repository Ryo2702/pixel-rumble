import { getWallets } from '@wallet-standard/app';
import type { Wallet, WalletAccount, WalletWithFeatures } from '@wallet-standard/base';
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
} from '@wallet-standard/features';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isSolanaAddress } from '../data/readonly/solana/validation';

export const SUPPORTED_WALLETS = ['Phantom', 'Solflare'] as const;
export type SupportedWalletName = (typeof SUPPORTED_WALLETS)[number];

const WALLET_STORAGE_KEY = 'pixel-rumble-wallet';
const WALLET_META: Record<SupportedWalletName, { url: string }> = {
  Phantom: { url: 'https://phantom.com/download' },
  Solflare: { url: 'https://www.solflare.com/download/' },
};

type SupportedWallet = WalletWithFeatures<StandardConnectFeature & StandardDisconnectFeature> & {
  features: Wallet['features'] & Partial<StandardEventsFeature>;
};
type EventsFeature = StandardEventsFeature[typeof StandardEvents];

export interface WalletOption {
  name: SupportedWalletName;
  url: string;
  icon?: string;
  wallet: SupportedWallet | null;
}

interface WalletConnection {
  wallet: SupportedWallet;
  account: WalletAccount;
}

interface WalletContextValue {
  options: readonly WalletOption[];
  connection: WalletConnection | null;
  status: 'idle' | 'connecting' | 'connected' | 'disconnecting' | 'error';
  error: string | null;
  connect: (name: SupportedWalletName) => Promise<boolean>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function isSupportedWalletName(name: string): name is SupportedWalletName {
  return (SUPPORTED_WALLETS as readonly string[]).includes(name);
}

function isSupportedWallet(wallet: Wallet): wallet is SupportedWallet {
  const connect = wallet.features[StandardConnect] as StandardConnectFeature[typeof StandardConnect] | undefined;
  const disconnect = wallet.features[StandardDisconnect] as StandardDisconnectFeature[typeof StandardDisconnect] | undefined;
  return isSupportedWalletName(wallet.name)
    && wallet.chains.some(chain => chain.startsWith('solana:'))
    && typeof connect?.connect === 'function'
    && typeof disconnect?.disconnect === 'function';
}

function readStoredWallet(): SupportedWalletName | null {
  try {
    const value = window.localStorage.getItem(WALLET_STORAGE_KEY);
    return value && isSupportedWalletName(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredWallet(name: SupportedWalletName | null) {
  try {
    if (name) window.localStorage.setItem(WALLET_STORAGE_KEY, name);
    else window.localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    // Wallet state still works when browser storage is unavailable.
  }
}

function walletError(error: unknown, name: SupportedWalletName, action: 'connect' | 'disconnect') {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  const message = error instanceof Error ? error.message : '';
  if (code === 4001 || /reject|denied|declin|cancel/i.test(message)) {
    return action === 'connect'
      ? `${name} connection was rejected. Approve the request in your wallet to continue.`
      : `${name} disconnect was cancelled in your wallet.`;
  }
  if (/not found|not installed|not detected|not ready/i.test(message)) {
    return `${name} is not available in this browser. Install it, then try again.`;
  }
  return action === 'connect'
    ? `Could not connect to ${name}. Please unlock the wallet and try again.`
    : `Could not disconnect from ${name}. The local connection was cleared.`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => getWallets(), []);
  const [discovered, setDiscovered] = useState<readonly SupportedWallet[]>([]);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [status, setStatus] = useState<WalletContextValue['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<WalletConnection | null>(null);
  const operationRef = useRef<Promise<boolean | void> | null>(null);
  const restoreAttempted = useRef(false);

  const clearConnection = useCallback(() => {
    connectionRef.current = null;
    setConnection(null);
  }, []);

  const activate = useCallback((wallet: SupportedWallet, account: WalletAccount) => {
    if (!isSolanaAddress(account.address)) throw new Error('Wallet returned an invalid Solana address.');
    const next = { wallet, account };
    connectionRef.current = next;
    setConnection(next);
    setStatus('connected');
    setError(null);
    writeStoredWallet(wallet.name as SupportedWalletName);
  }, []);

  const applyAccounts = useCallback((wallet: SupportedWallet, accounts: readonly WalletAccount[]) => {
    if (connectionRef.current?.wallet !== wallet) return;
    const account = accounts[0];
    if (!account) {
      clearConnection();
      writeStoredWallet(null);
      setStatus('idle');
      return;
    }
    try {
      activate(wallet, account);
    } catch (nextError) {
      clearConnection();
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'Wallet returned an invalid Solana address.');
    }
  }, [activate, clearConnection]);

  useEffect(() => {
    const syncWallets = () => {
      const wallets = registry.get().filter(isSupportedWallet);
      setDiscovered(wallets);
      const activeWallet = connectionRef.current?.wallet;
      if (activeWallet && !wallets.includes(activeWallet)) {
        clearConnection();
        writeStoredWallet(null);
        setStatus('idle');
      }
    };
    syncWallets();
    const offRegister = registry.on('register', syncWallets);
    const offUnregister = registry.on('unregister', syncWallets);
    return () => { offRegister(); offUnregister(); };
  }, [clearConnection, registry]);

  useEffect(() => {
    const wallet = connection?.wallet;
    if (!wallet) return;
    const events = wallet.features[StandardEvents] as EventsFeature | undefined;
    return events?.on('change', properties => {
      if (properties.accounts) applyAccounts(wallet, properties.accounts);
    });
  }, [applyAccounts, connection?.wallet]);

  const options = useMemo(() => SUPPORTED_WALLETS.map(name => {
    const wallet = discovered.find(item => item.name === name) ?? null;
    return { name, url: WALLET_META[name].url, icon: wallet?.icon, wallet };
  }), [discovered]);

  const runConnect = useCallback(async (name: SupportedWalletName, silent: boolean) => {
    const option = options.find(item => item.name === name);
    const wallet = option?.wallet;
    if (!wallet) {
      if (!silent) {
        setStatus('error');
        setError(`${name} is not installed. Use the official install link to add it to this browser.`);
      }
      return false;
    }

    setStatus('connecting');
    if (!silent) setError(null);

    try {
      const connect = wallet.features[StandardConnect].connect;
      const accounts = silent && wallet.accounts.length
        ? wallet.accounts
        : (await connect(silent ? { silent: true } : undefined)).accounts;
      const account = accounts[0] ?? wallet.accounts[0];
      if (!account) throw new Error('The wallet did not return a Solana account.');
      activate(wallet, account);
      return true;
    } catch (nextError) {
      if (!silent) {
        setStatus('error');
        setError(walletError(nextError, name, 'connect'));
      } else {
        setStatus('idle');
      }
      return false;
    }
  }, [activate, options]);

  const startConnect = useCallback((name: SupportedWalletName, silent: boolean) => {
    if (operationRef.current) return operationRef.current as Promise<boolean>;
    const operation = runConnect(name, silent);
    operationRef.current = operation;
    void operation.finally(() => {
      if (operationRef.current === operation) operationRef.current = null;
    });
    return operation;
  }, [runConnect]);

  const connect = useCallback((name: SupportedWalletName) => startConnect(name, false), [startConnect]);

  const disconnect = useCallback(async () => {
    if (operationRef.current) return;
    const active = connectionRef.current;
    if (!active) {
      writeStoredWallet(null);
      return;
    }

    const operation = (async () => {
      setStatus('disconnecting');
      setError(null);
      try {
        await active.wallet.features[StandardDisconnect].disconnect();
        clearConnection();
        writeStoredWallet(null);
        setStatus('idle');
      } catch (nextError) {
        clearConnection();
        writeStoredWallet(null);
        setStatus('error');
        setError(walletError(nextError, active.wallet.name as SupportedWalletName, 'disconnect'));
      }
    })();
    operationRef.current = operation;
    void operation.finally(() => {
      if (operationRef.current === operation) operationRef.current = null;
    });
    await operation;
  }, [clearConnection]);

  useEffect(() => {
    const name = readStoredWallet();
    const option = name && options.find(item => item.name === name);
    if (restoreAttempted.current || !name || !option?.wallet) return;
    restoreAttempted.current = true;
    void startConnect(name, true);
  }, [options, startConnect]);

  const value = useMemo<WalletContextValue>(() => ({
    options,
    connection,
    status,
    error,
    connect,
    disconnect,
    clearError: () => setError(null),
  }), [connection, connect, disconnect, error, options, status]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider.');
  return context;
}
