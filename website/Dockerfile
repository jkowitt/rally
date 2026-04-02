FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Only copy what's needed for production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

CMD ["node", "server.js"]
