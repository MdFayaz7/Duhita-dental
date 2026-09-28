# Website — Vite + React, built then served as static files by nginx.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
# Not `npm ci`: Vite 8's rolldown bundler ships a native binary per platform as an
# optional dependency, and a lockfile written on a Mac only resolves the Mac one —
# `npm ci` would then fail to find the Linux binary inside this container. `npm
# install` re-resolves optional deps for whatever platform it's actually running on.
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
