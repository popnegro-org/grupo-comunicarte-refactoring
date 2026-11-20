import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type SessionState = 'checking' | 'authorized' | 'unauthorized' | 'error';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sessionState, setSessionState] = useState<SessionState>('checking');

  useEffect(() => {
    let active = true;

    fetch('/api/admin/session', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!active) return;

        if (response.status === 401 || response.status === 403) {
          setSessionState('unauthorized');
          return;
        }

        if (!response.ok) {
          setSessionState('error');
          return;
        }

        const payload = await response.json().catch(() => null);
        setSessionState(
          payload?.status === 'success' && payload?.data?.authenticated === true
            ? 'authorized'
            : 'error',
        );
      })
      .catch(() => {
        if (active) setSessionState('error');
      });

    return () => {
      active = false;
    };
  }, []);

  if (sessionState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600" role="status" aria-live="polite" aria-busy="true">
        Verificando sesión administrativa…
      </div>
    );
  }

  if (sessionState === 'unauthorized') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (sessionState === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center" role="alert">
        <p className="text-sm font-medium text-slate-700">No se pudo verificar la sesión administrativa.</p>
        <button type="button" onClick={() => window.location.reload()} className="text-sm font-semibold underline underline-offset-2">
          Reintentar
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
