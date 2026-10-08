import { createRoot } from 'react-dom/client';
import App from './App';
import { WalletProvider } from './wallet/WalletProvider';

createRoot(document.getElementById('root')!).render(<WalletProvider><App/></WalletProvider>);
