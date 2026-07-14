FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js watch-party-core.js ./
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "server.js"]
