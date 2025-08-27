# -------- Build stage --------
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    # Nếu bạn có biến môi trường build-time, chúng nên là NEXT_PUBLIC_* hoặc dùng ARG
    RUN npm run build
    
    # -------- Runtime stage --------
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    COPY --from=builder /app/package*.json ./
    RUN npm ci --omit=dev
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    # nếu dùng next.config.js (output: standalone) thì copy theo config đó
    
    EXPOSE 3000
    CMD ["npm", "run", "start"]
    