import { useEffect } from 'react';

const setMeta = (name, content) => {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/** Per-page <title> and meta description. */
export default function useSeo(title, description) {
  useEffect(() => {
    document.title = title;
    if (description) setMeta('description', description);
  }, [title, description]);
}
