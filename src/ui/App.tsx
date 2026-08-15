/**
 * Armazón de la aplicación.
 *
 * Se usa HashRouter y no BrowserRouter porque el destino de despliegue es
 * GitHub Pages, que sirve archivos estáticos y devolvería 404 al recargar
 * una ruta profunda (ver DECISIONS.md ADR-003).
 */

import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider } from './session';
import { RoleSwitcher } from './components/RoleSwitcher';
import { SongsPage } from './pages/SongsPage';
import { SongPage } from './pages/SongPage';
import { ServicePage } from './pages/ServicePage';
import { RehearsalPage } from './pages/RehearsalPage';
import { TutorialsPage } from './pages/TutorialsPage';

const NAV = [
  { to: '/canciones', label: 'Canciones', icon: '♪' },
  { to: '/servicio', label: 'Servicio', icon: '✦' },
  { to: '/ensayo', label: 'Ensayo', icon: '◷' },
  { to: '/tutoriales', label: 'Aprender', icon: '◈' },
];

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-aurora-border bg-aurora-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">
            Aurora<span className="text-aurora-violet"> OS</span>
          </p>
          <p className="truncate text-xs text-aurora-muted">Ministerio de Alabanza Aurora</p>
        </div>
        <RoleSwitcher />
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-aurora-border bg-aurora-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-2xl">
        {NAV.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  // 64px de alto: objetivo táctil cómodo con el pulgar.
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors',
                  isActive ? 'text-aurora-violet-soft' : 'text-aurora-muted',
                ].join(' ')
              }
            >
              <span aria-hidden className="text-lg leading-none">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <div className="min-h-dvh">
          <Header />
          <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
            <Routes>
              <Route path="/" element={<Navigate to="/canciones" replace />} />
              <Route path="/canciones" element={<SongsPage />} />
              <Route path="/canciones/:songId" element={<SongPage />} />
              <Route path="/servicio" element={<ServicePage />} />
              <Route path="/ensayo" element={<RehearsalPage />} />
              <Route path="/tutoriales" element={<TutorialsPage />} />
              <Route path="*" element={<Navigate to="/canciones" replace />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </HashRouter>
    </SessionProvider>
  );
}
