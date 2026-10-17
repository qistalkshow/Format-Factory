import { useEffect, useState } from 'preact/hooks';
export function useOffline() {
  const [status, setStatus] = useState<
    | 'devMode'
    | 'offlineLoading'
    | 'offlineReady'
    | 'offlineFailed'
    | 'offlineUpdate'
  >(import.meta.env.DEV ? 'devMode' : 'offlineLoading');
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let mounted = true;
    let registration: ServiceWorkerRegistration | undefined;
    const workers = new Set<ServiceWorker>();
    const updated = () => {
      if (
        mounted &&
        registration?.waiting &&
        navigator.serviceWorker.controller
      ) {
        clearTimeout(timeout);
        setStatus('offlineUpdate');
      }
    };
    const installing = () => {
      const worker = registration?.installing;
      if (worker && !workers.has(worker)) {
        workers.add(worker);
        worker.addEventListener('statechange', updated);
      }
    };
    const timeout = setTimeout(() => {
      if (mounted) setStatus('offlineFailed');
    }, 30_000);
    const complete = (value: 'offlineReady' | 'offlineFailed') => {
      clearTimeout(timeout);
      if (mounted) setStatus(value);
    };
    if (!('serviceWorker' in navigator)) complete('offlineFailed');
    else
      void navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, {
          scope: import.meta.env.BASE_URL,
        })
        .then((value) => {
          registration = value;
          value.addEventListener('updatefound', installing);
          installing();
          return navigator.serviceWorker.ready;
        })
        .then(() => {
          complete('offlineReady');
          updated();
        })
        .catch(() => complete('offlineFailed'));
    return () => {
      mounted = false;
      clearTimeout(timeout);
      registration?.removeEventListener('updatefound', installing);
      for (const worker of workers)
        worker.removeEventListener('statechange', updated);
    };
  }, []);
  return status;
}
