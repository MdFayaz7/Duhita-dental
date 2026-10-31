import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ssrHead } from '../lib/ssrHead';

const DOMAIN = 'https://duhitadental.com';
const DEFAULT_IMAGE = `${DOMAIN}/images/hero-smile.jpg`;

function setMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setSchemaScript(id, schemaObj) {
  let script = document.getElementById(id);
  if (!schemaObj) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaObj);
}

/** The values every page's <head> needs, shared by the browser effect and the build-time prerender. */
function seoValues(title, description, pathname, { image = DEFAULT_IMAGE, type = 'website', noindex = false, schema = null, canonicalPath = null }) {
  const path = canonicalPath || pathname;
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  return {
    title,
    description,
    type,
    schema,
    canonical: `${DOMAIN}${cleanPath}`,
    image: image.startsWith('http') ? image : `${DOMAIN}${image.startsWith('/') ? '' : '/'}${image}`,
    robots: noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  };
}

/**
 * Enterprise SEO Hook
 * Dynamically updates Title, Description, Canonical tag, OpenGraph, Twitter Cards,
 * Robots indexing directive, and Schema markup on every page change.
 * During the build-time prerender (scripts/prerender.mjs) effects don't run, so the
 * same values are recorded in `ssrHead` and written into that page's static HTML.
 */
export default function useSeo(title, description, options = {}) {
  const { pathname } = useLocation();
  const seo = seoValues(title, description, pathname, options);
  if (import.meta.env.SSR) Object.assign(ssrHead, seo);
  const { canonical: canonicalUrl, image: absImage, robots: robotsDirective, type, schema } = seo;

  useEffect(() => {
    // 1. Page Title
    if (title) {
      document.title = title;
    }

    // 2. Meta Description
    if (description) {
      setMetaTag('name', 'description', description);
    }

    // 3. Robots (Ensure Google never blocks public pages with unintended noindex)
    setMetaTag('name', 'robots', robotsDirective);

    // 4. Canonical Tag
    setCanonical(canonicalUrl);

    // 5. OpenGraph Tags (Facebook, WhatsApp, LinkedIn)
    setMetaTag('property', 'og:title', title);
    if (description) setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:image', absImage);
    setMetaTag('property', 'og:image:secure_url', absImage);

    // 6. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    if (description) setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', absImage);

    // 7. Dynamic JSON-LD Schema
    if (schema) {
      setSchemaScript('page-schema-ld', schema);
    }

    return () => {
      if (schema) {
        const s = document.getElementById('page-schema-ld');
        if (s) s.remove();
      }
    };
  }, [title, description, absImage, type, robotsDirective, schema, canonicalUrl]);
}
