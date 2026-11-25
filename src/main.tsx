import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initClarity} from './lib/clarity';
import { prefetchInventory } from './hooks/useInventory';
import { initAnalytics } from './lib/analytics';

if (window.location.pathname === '/inventario') {
  void prefetchInventory();
  void import('./pages/Inventario');
}

initClarity();
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
