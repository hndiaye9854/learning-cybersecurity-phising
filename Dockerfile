# syntax=docker/dockerfile:1
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public

# Dossier de données accessible à l'utilisateur non-root "node"
RUN mkdir -p /app/data && chown node:node /app/data
USER node

ENV PORT=3010 DATA_FILE=/app/data/submissions.json
EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3010/healthz || exit 1

CMD ["node", "src/server.js"]
