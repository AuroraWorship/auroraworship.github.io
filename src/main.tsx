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

// Solo en la compilación de producción: en desarrollo un service worker
// cacheando módulos estorba más de lo que ayuda.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // El worker precachea por su cuenta el JS y el CSS de arranque leyéndolos
    // del index.html: hacerlo desde aquí dependía de que ya hubiera tomado el
    // control, que es una carrera.
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Sin service worker la aplicación sigue funcionando, solo que en línea.
    });
  });
}

