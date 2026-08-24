FROM node:22.23.1-bookworm-slim

ARG CHROMIUM_PACKAGE_VERSION=151.0.7922.173-1~deb12u1

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PDF_EXPORT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium=${CHROMIUM_PACKAGE_VERSION} \
    fonts-liberation \
    openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY eslint.config.mjs ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN npm run build -w @kids-books/shared \
  && npm run build -w @kids-books/backend \
  && npm prune --omit=dev

CMD ["node", "apps/backend/dist/main.js"]
