FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server ./server
ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server/relay.mjs"]
