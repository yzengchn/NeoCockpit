import { useEffect, useState } from 'react';
import { presenceApi } from '@/services/api';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/utils/storage';

const HEARTBEAT_INTERVAL = 20_000;
const ANON_SESSION_KEY = 'aigc_anon_session_id';

function createAnonSessionId(): string {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto && typeof browserCrypto.randomUUID === 'function') {
    return browserCrypto.randomUUID();
  }

  if (browserCrypto && typeof browserCrypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    browserCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateAnonSessionId(): string {
  let sessionId = safeLocalStorageGet(ANON_SESSION_KEY);
  if (!sessionId) {
    sessionId = createAnonSessionId();
    safeLocalStorageSet(ANON_SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Global presence heartbeat hook.
 *
 * Uses anonymous session-based heartbeat for all visitors (both logged-in
 * and anonymous). Each browser generates a persistent session ID that is
 * used to track online presence via TTL-based in-memory entries.
 */
export function usePresence(startDelay = 0) {
  const [onlineTotal, setOnlineTotal] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    let cancelled = false;

    const startHeartbeat = () => {
      const anonSessionId = getOrCreateAnonSessionId();
      const sendHeartbeat = () => {
        presenceApi.anonymousHeartbeat(anonSessionId)
          .then((data) => {
            if (!cancelled) setOnlineTotal(data.total);
          })
          .catch(() => {});
      };

      sendHeartbeat();
      interval = window.setInterval(() => {
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL);
    };

    if (startDelay > 0) {
      const timer = window.setTimeout(startHeartbeat, startDelay);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        if (interval !== undefined) window.clearInterval(interval);
        // Backend TTL will expire the entry naturally when the user closes the tab.
      };
    }

    startHeartbeat();

    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
      // Backend TTL will expire the entry naturally when the user closes the tab.
    };
  }, [startDelay]);

  return onlineTotal;
}
