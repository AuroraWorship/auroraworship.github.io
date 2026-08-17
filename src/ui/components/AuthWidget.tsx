import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../session';

/**
 * Entrar / salir con cuenta real (ADR-023).
 *
 * Solo se monta cuando `auth.configured` es verdadero — mientras no haya
 * backend, la cabecera sigue mostrando `RoleSwitcher`, sin cambios.
 */
export function AuthWidget() {
  const { auth } = useSession();
  const [open, setOpen] = useState(false);

  if (auth.loading) {
    return <span className="text-xs text-aurora-muted">Cargando…</span>;
  }

  if (auth.profile) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden max-w-[9rem] truncate text-sm text-aurora-muted sm:inline">
          {auth.profile.displayName || auth.email}
        </span>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="h-11 rounded-lg border border-aurora-border px-3 text-xs"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 shrink-0 rounded-lg bg-aurora-violet-solid px-4 text-sm font-medium text-white"
      >
        Entrar
      </button>
      {open && <LoginModal onClose={() => setOpen(false)} />}
    </>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const { auth } = useSession();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const problem =
      mode === 'signin'
        ? await auth.signIn(email.trim(), password)
        : await auth.signUp(email.trim(), password, displayName.trim());
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    if (mode === 'signup') {
      // Con confirmación de correo activada, entrar no da sesión todavía.
      setSent(true);
      return;
    }
    onClose();
  };

  // Portal a document.body: el header es `backdrop-blur` (backdrop-filter),
  // que crea su propio contenedor para descendientes `fixed` — sin el
  // portal, el modal se ancla al tamaño del header en vez de a la pantalla.
  return createPortal(
    <div
      role="dialog"
      aria-label={mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
      className="fixed inset-0 z-30 flex items-end justify-center overflow-y-auto bg-black/50 sm:items-center"
    >
      <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-aurora-surface p-5 sm:rounded-2xl">
        {sent ? (
          <>
            <h2 className="text-lg font-semibold">Revisa tu correo</h2>
            <p className="mt-2 text-sm text-aurora-muted">
              Te mandamos un enlace a {email} para confirmar la cuenta. Vuelve aquí y entra
              cuando lo hayas confirmado.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 h-12 w-full rounded-xl border border-aurora-border text-sm"
            >
              Cerrar
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{mode === 'signin' ? 'Entrar' : 'Crear cuenta'}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="grid h-11 w-11 place-items-center rounded-full text-aurora-muted"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {mode === 'signup' && (
                <label className="block">
                  <span className={labelClass}>Cómo te llamas</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <label className="block">
                <span className={labelClass}>Correo</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className={inputClass}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-sm">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy || !email || !password || (mode === 'signup' && !displayName.trim())}
              onClick={() => void submit()}
              className="mt-4 h-12 w-full rounded-xl bg-aurora-violet-solid text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="mt-3 h-11 w-full text-sm text-aurora-violet-soft underline underline-offset-2"
            >
              {mode === 'signin' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted';
const inputClass =
  'h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface-2 px-3 text-base text-aurora-text';
