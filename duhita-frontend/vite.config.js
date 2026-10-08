import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const GALLERY_DIR = resolve(process.cwd(), 'public/images/gallery');
const VIRTUAL_ID = 'virtual:gallery';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const listPhotos = (folder) => {
  try {
    return readdirSync(resolve(GALLERY_DIR, folder))
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort();
  } catch {
    return [];
  }
};

/**
 * Exposes whatever image files are currently in public/images/gallery/<clinic|camps>.
 * Drop files in or delete them and the galleries follow — no code change needed.
 */
function galleryFolders() {
  return {
    name: 'duhita-gallery-folders',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : null),
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export const clinicFiles = ${JSON.stringify(listPhotos('clinic'))};
export const campFiles = ${JSON.stringify(listPhotos('camps'))};`;
    },
    configureServer(server) {
      server.watcher.add(GALLERY_DIR);
      const refresh = (file) => {
        if (!file.startsWith(GALLERY_DIR)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

function cacheStaticAssets() {
  return {
    name: 'duhita-cache-static-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/images/') || req.url.startsWith('/fonts/'))) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/images/') || req.url.startsWith('/fonts/'))) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), galleryFolders(), cacheStaticAssets()],
  server: { port: 5180 },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('react-router') || id.includes('react-router-dom')) {
              return 'vendor-router';
            }
            if (id.includes('react-icons')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
