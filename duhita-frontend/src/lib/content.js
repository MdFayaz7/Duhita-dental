/**
 * Live website content from the API (what the admin dashboard manages),
 * with the photos/data built into the site as an instant fallback.
 *
 * - The fallback renders immediately, so pages are never empty while the API
 *   wakes up (Render's free tier can take ~30s after sleeping).
 * - When the API answers, its data replaces the fallback — including an empty
 *   list, so photos deleted in the admin disappear from the site too.
 * - If the API is unreachable, the fallback simply stays.
 */
import { useEffect, useState } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

/** Files stored by the API live on the API host, not on the website. */
export const apiFileUrl = (path) =>
  path?.startsWith('/api/files/') || path?.startsWith('/uploads/') ? `${BASE}${path}` : path;

const requests = new Map();

function getJson(path) {
  if (!requests.has(path)) {
    const request = fetch(`${BASE}${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        requests.delete(path); // allow a retry on the next page view
        throw err;
      });
    requests.set(path, request);
  }
  return requests.get(path);
}

/** useLiveList('/api/research', mapItem, fallbackList) */
export function useLiveList(path, mapItem, fallback) {
  const [items, setItems] = useState(fallback);

  useEffect(() => {
    let active = true;
    getJson(path)
      .then((data) => active && setItems((data.items || []).map(mapItem)))
      .catch(() => { /* keep the built-in fallback */ });
    return () => { active = false; };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  return items;
}
