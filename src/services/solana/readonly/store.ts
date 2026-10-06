import { useEffect, useSyncExternalStore } from 'react';
import { readAddress } from './accounts';
import { getNetworkSnapshot } from './network';
import { readTokenMint } from './tokens';
import type { LookupState, SolanaReadState } from './types';

const REFRESH_INTERVAL = 30_000;

const idle = <T>(): LookupState<T> => ({ status: 'idle', data: null, error: null });

class SolanaReadStore {
  private state: SolanaReadState = {
    status: 'loading',
    refreshing: false,
    network: null,
    lastUpdated: null,
    error: null,
    address: idle(),
    token: idle(),
    refresh: () => this.refresh(),
    lookupAddress: value => this.lookupAddress(value),
    lookupToken: value => this.lookupToken(value),
  };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;
  private addressInFlight = false;
  private tokenInFlight = false;

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.state;

  start() {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => { void this.refresh(); }, REFRESH_INTERVAL);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  refresh = async () => {
    if (this.inFlight) return;
    this.inFlight = true;
    this.setState({ refreshing: true, status: this.state.network ? 'ready' : 'loading', error: null });
    try {
      const network = await getNetworkSnapshot();
      this.setState({ network, lastUpdated: Date.now(), status: 'ready', error: null });
    } catch (error) {
      console.error('Solana Mainnet refresh failed.', error);
      this.setState({ status: 'error', error: 'SOLANA DATA TEMPORARILY UNAVAILABLE' });
    } finally {
      this.inFlight = false;
      this.setState({ refreshing: false });
    }
  };

  lookupAddress = async (address: string) => {
    if (this.addressInFlight) return;
    this.addressInFlight = true;
    this.setState({ address: { ...this.state.address, status: 'loading', error: null } });
    try {
      this.setState({ address: { status: 'ready', data: await readAddress(address.trim()), error: null } });
    } catch (error) {
      console.error('Solana address lookup failed.', error);
      this.setState({ address: { ...this.state.address, status: 'error', error: error instanceof Error && error.message.startsWith('Enter ') ? error.message : 'ADDRESS DATA TEMPORARILY UNAVAILABLE' } });
    } finally {
      this.addressInFlight = false;
    }
  };

  lookupToken = async (mint: string) => {
    if (this.tokenInFlight) return;
    this.tokenInFlight = true;
    this.setState({ token: { ...this.state.token, status: 'loading', error: null } });
    try {
      this.setState({ token: { status: 'ready', data: await readTokenMint(mint.trim()), error: null } });
    } catch (error) {
      console.error('Solana token lookup failed.', error);
      this.setState({ token: { ...this.state.token, status: 'error', error: error instanceof Error && error.message.startsWith('Enter ') ? error.message : 'TOKEN DATA TEMPORARILY UNAVAILABLE' } });
    } finally {
      this.tokenInFlight = false;
    }
  };

  private setState(partial: Partial<SolanaReadState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener());
  }
}

export const solanaReadStore = new SolanaReadStore();

export function useSolanaReadStore() {
  const state = useSyncExternalStore(solanaReadStore.subscribe, solanaReadStore.getSnapshot, solanaReadStore.getSnapshot);
  useEffect(() => { solanaReadStore.start(); return () => solanaReadStore.stop(); }, []);
  return state;
}
