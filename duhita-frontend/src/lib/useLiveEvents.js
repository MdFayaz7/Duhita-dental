import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Real-time SSE subscriber hook for instant live updates across Admin and Patient interfaces.
 * Reconnects automatically if connection drops.
 */
export function useLiveEvents(onEvent) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let es = null;
    let timer = null;

    function connect() {
      try {
        es = new EventSource(`${API_BASE}/api/events`);

        es.onopen = () => {
          setConnected(true);
        };

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (handlerRef.current) {
              handlerRef.current(data);
            }
          } catch {
            // Ignore parse errors (e.g. heartbeat pings)
          }
        };

        es.onerror = () => {
          setConnected(false);
          es.close();
          // Attempt reconnect after 3 seconds
          timer = setTimeout(connect, 3000);
        };
      } catch {
        timer = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (timer) clearTimeout(timer);
      if (es) es.close();
    };
  }, []);

  return { connected };
}
