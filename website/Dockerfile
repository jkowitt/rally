FROM node:20-alpine AS builder

WORKDIR /app

ENV VITE_SUPABASE_URL=https://juaqategmrghsfkbaiap.supabase.co
ENV VITE_SUPABASE_ANON_KEY=sb_publishable_yBmy9yYrchSL94IWrth3kA_qCCIGgWz

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

CMD ["node", "server.js"]
