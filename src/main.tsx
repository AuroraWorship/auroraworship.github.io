import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el nodo raíz #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
