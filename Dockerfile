# KPPulse — satu service melayani API + hasil build client (SPA). Cocok untuk free tier
# (Render/Fly/Railway). SQLite ephemeral: di-seed ulang tiap start agar data "hari ini" segar.
FROM node:20-slim
WORKDIR /app

# Prisma butuh openssl
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Manifest dulu (cache layer). Skema Prisma diperlukan oleh postinstall (prisma generate).
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY server/prisma ./server/prisma
RUN npm install

# Sumber + build client (vite → client/dist)
COPY . .
RUN npm run build -w @muatcerdas/client

ENV NODE_ENV=production
ENV PORT=10000
ENV AUTH_ENABLED=true
ENV DATABASE_URL=file:./prod.db
EXPOSE 10000

# Saat start: terapkan migrasi → seed (data hari ini segar) → jalankan server (API + client).
CMD npx prisma migrate deploy --schema server/prisma/schema.prisma \
  && npm run db:seed -w @muatcerdas/server \
  && npm run start -w @muatcerdas/server
