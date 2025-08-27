# ---------- Stage 1: build ----------
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # 1) Cài deps với cache tốt
    COPY package*.json ./
    RUN npm ci --prefer-offline --no-audit --no-fund
    
    # 2) Copy source và build
    COPY . .
    # Đảm bảo Next tạo standalone
    # (thêm output: 'standalone' trong next.config.js)
    RUN npm run build
    
    # ---------- Stage 2: runtime ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    # Tạo user không phải root
    RUN addgroup -S nodegrp && adduser -S nodeuser -G nodegrp
    
    # 3) Chỉ copy những gì cần để chạy
    COPY --from=build /app/.next/standalone ./
    COPY --from=build /app/public ./public
    COPY --from=build /app/.next/static ./.next/static
    
    USER nodeuser
    EXPOSE 3000
    # Healthcheck nhẹ
    HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
    CMD ["node", "server.js"]
    