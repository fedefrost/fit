FROM node:22-slim

# Prisma necesita OpenSSL
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

# Aplica migraciones pendientes y levanta Next.js en modo desarrollo
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
