import { useEffect } from 'react';

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

/**
 * Enterprise SEO Hook
 * Dynamically updates Title, Description, Canonical tag, OpenGraph, Twitter Cards,
 * Robots indexing directive, and Schema markup on every page change.
 */
export default function useSeo(title, description, options = {}) {
  const {
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    schema = null,
    canonicalPath = null,
  } = options;

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
    const robotsDirective = noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMetaTag('name', 'robots', robotsDirective);

    // 4. Canonical Tag
    const pathname = canonicalPath || window.location.pathname;
    const cleanPath = pathname === '/' ? '' : pathname.replace(/\/+$/, '');
    const canonicalUrl = `${DOMAIN}${cleanPath}`;
    setCanonical(canonicalUrl);

    // 5. OpenGraph Tags (Facebook, WhatsApp, LinkedIn)
    setMetaTag('property', 'og:title', title);
    if (description) setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', type);
    const absImage = image.startsWith('http') ? image : `${DOMAIN}${image.startsWith('/') ? '' : '/'}${image}`;
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
  }, [title, description, image, type, noindex, schema, canonicalPath]);
}
