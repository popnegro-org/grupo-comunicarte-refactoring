import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initClarity} from './lib/clarity';
import { prefetchInventory } from './hooks/useInventory';

if (window.location.pathname === '/inventario') {
  void prefetchInventory();
}

initClarity();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
