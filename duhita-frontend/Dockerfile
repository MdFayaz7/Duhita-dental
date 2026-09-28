# Website — Vite + React, built then served as static files by nginx.
FROM node:22-slim AS build
WORKDIR /app
# package.json only — no lockfile. Vite 8's rolldown bundler installs a native
# binary per OS as an optional dependency; a lockfile committed from a Mac pins
# npm to the Mac one even under plain `npm install` (a known npm bug with
# optional deps: https://github.com/npm/cli/issues/4828), and the Linux build
# then can't find its binary. Resolving fresh here avoids that entirely.
COPY package.json ./
RUN npm install
COPY . .
# Baked in at build time — Vite inlines VITE_* vars into the JS bundle.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1
