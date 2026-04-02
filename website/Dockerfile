FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV VITE_SUPABASE_URL=https://juaqategmrghsfkbaiap.supabase.co
ENV VITE_SUPABASE_ANON_KEY=sb_publishable_yBmy9yYrchSL94IWrth3kA_qCCIGgWz

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
