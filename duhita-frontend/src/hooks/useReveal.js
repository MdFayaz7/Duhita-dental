import { useEffect } from 'react';

const SELECTOR = '.reveal:not(.is-visible)';

/**
 * Fades `.reveal` elements in as they scroll into view.
 *
 * Also watches the page for elements added later — e.g. gallery photos, doctors
 * and research papers that arrive from the API after the first render — so
 * live content is never left invisible.
 */
export default function useReveal(deps = []) {
  useEffect(() => {
    const show = (el) => el.classList.add('is-visible');

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll(SELECTOR).forEach(show);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    const watch = (root) => {
      if (root.nodeType !== 1) return;
      if (root.matches(SELECTOR)) io.observe(root);
      root.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    };

    watch(document.body);

    // Content that mounts after this effect (API data, route chunks) gets observed too.
    const mo = new MutationObserver((mutations) =>
      mutations.forEach((m) => m.addedNodes.forEach(watch)),
    );
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
