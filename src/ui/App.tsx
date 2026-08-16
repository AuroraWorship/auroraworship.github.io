/**
 * Armazón de la aplicación.
 *
 * Se usa HashRouter y no BrowserRouter porque el destino de despliegue es
 * GitHub Pages, que sirve archivos estáticos y devolvería 404 al recargar
 * una ruta profunda (ver DECISIONS.md ADR-003).
 */

import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider } from './session';
import { RoleSwitcher } from './components/RoleSwitcher';
import { SongsPage } from './pages/SongsPage';
import { SongPage } from './pages/SongPage';
const SongEditorPage = lazy(() => import('./pages/SongEditorPage').then((m) => ({ default: m.SongEditorPage })));
import { ServicePage, ServicesPage } from './pages/ServicePage';
import { HistoryPage } from './pages/HistoryPage';
import { RehearsalPage } from './pages/RehearsalPage';
import { TutorialsPage } from './pages/TutorialsPage';
import { PreparationPage } from './pages/PreparationPage';
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const ServiceEditorPage = lazy(() => import('./pages/ServiceEditorPage').then((m) => ({ default: m.ServiceEditorPage })));
import { LivePage } from './pages/LivePage';
const RehearsalEditorPage = lazy(() => import('./pages/RehearsalEditorPage').then((m) => ({ default: m.RehearsalEditorPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TutorialEditorPage = lazy(() => import('./pages/TutorialEditorPage').then((m) => ({ default: m.TutorialEditorPage })));
import { CoursesPage } from './pages/CoursesPage';
import { CoursePage } from './pages/CoursePage';
const CourseEditorPage = lazy(() => import('./pages/CourseEditorPage').then((m) => ({ default: m.CourseEditorPage })));

const NAV = [
  { to: '/canciones', label: 'Canciones', icon: '♪' },
  { to: '/preparacion', label: 'Yo', icon: '★' },
  { to: '/servicio', label: 'Servicio', icon: '✦' },
  { to: '/ensayo', label: 'Ensayo', icon: '◷' },
  { to: '/tutoriales', label: 'Aprender', icon: '◈' },
];

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-aurora-border bg-aurora-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          {/* Forma corta en la interfaz: el nombre completo es Aurora Worship,
              pero en una cabecera de teléfono se trunca y se lee peor. */}
          <p className="text-lg font-semibold leading-tight tracking-tight">
            Aurora<span className="text-aurora-violet">.</span>
          </p>
          <p className="truncate text-xs text-aurora-muted">Ministerio de Alabanza</p>
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

/**
 * Armazón de la aplicación.
 *
 * El modo en vivo se sale del armazón por completo: no basta con taparlo con
 * una capa encima, porque la cabecera y la navegación seguirían existiendo
 * debajo — accesibles al tabulador y al lector de pantalla. En el atril, ese
 * ruido es justo lo que hay que quitar.
 */
/**
 * Precarga de las pantallas separadas.
 *
 * Sin esto, dividir el paquete rompería el uso sin conexión: un trozo que
 * nunca se ha visitado no está en la caché, y abrir el editor en el templo sin
 * datos fallaría. Se piden cuando el navegador está ocioso, así que no compiten
 * con el primer pintado.
 */
function usePrefetchEditors() {
  useEffect(() => {
    const cargar = () => {
      void import('./pages/SongEditorPage');
      void import('./pages/ServiceEditorPage');
      void import('./pages/RehearsalEditorPage');
      void import('./pages/TutorialEditorPage');
      void import('./pages/SettingsPage');
      void import('./pages/TeamPage');
      void import('./pages/CourseEditorPage');
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(cargar, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(cargar, 2000);
    return () => clearTimeout(id);
  }, []);
}

function Shell() {
  usePrefetchEditors();
  const { pathname } = useLocation();
  const live = pathname.startsWith('/vivo');

  if (live) {
    return (
      <Routes>
        <Route path="/vivo" element={<LivePage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Las pantallas de edición se cargan aparte: solo las abre el
            liderazgo, y no tienen por qué pesar en el arranque del músico. */}
        <Suspense fallback={<p className="text-aurora-muted">Cargando…</p>}>
        <Routes>
          <Route path="/" element={<Navigate to="/canciones" replace />} />
          <Route path="/canciones" element={<SongsPage />} />
          {/* La ruta estática va antes que la dinámica para que "nueva"
              no se lea como un identificador de canción. */}
          <Route path="/canciones/nueva" element={<SongEditorPage />} />
          <Route path="/canciones/:songId" element={<SongPage />} />
          <Route path="/canciones/:songId/editar" element={<SongEditorPage />} />
          <Route path="/preparacion" element={<PreparationPage />} />
          <Route path="/equipo" element={<TeamPage />} />
          <Route path="/servicio" element={<ServicePage />} />
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/historial" element={<HistoryPage />} />
          {/* Estática antes que dinámica: "nuevo" no es un identificador. */}
          <Route path="/servicio/nuevo" element={<ServiceEditorPage />} />
          <Route path="/servicio/:serviceId" element={<ServicePage />} />
          <Route path="/servicio/:serviceId/planificar" element={<ServiceEditorPage />} />
          <Route path="/ensayo" element={<RehearsalPage />} />
          {/* Estática antes que dinámica: "nuevo" no es un identificador. */}
          <Route path="/ensayo/nuevo" element={<RehearsalEditorPage />} />
          <Route path="/ensayo/:rehearsalId" element={<RehearsalEditorPage />} />
          <Route path="/tutoriales" element={<TutorialsPage />} />
          {/* Estática antes que dinámica: "nuevo" no es un identificador. */}
          <Route path="/tutoriales/nuevo" element={<TutorialEditorPage />} />
          <Route path="/tutoriales/:tutorialId" element={<TutorialEditorPage />} />
          <Route path="/academia" element={<CoursesPage />} />
          {/* Estática antes que dinámica: "nuevo" no es un identificador. */}
          <Route path="/academia/nuevo" element={<CourseEditorPage />} />
          <Route path="/academia/:courseId" element={<CoursePage />} />
          <Route path="/academia/:courseId/editar" element={<CourseEditorPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/canciones" replace />} />
        </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

export function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </SessionProvider>
  );
}
