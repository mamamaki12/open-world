FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server ./server
ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787
ENV WORLD_FILE=/data/shared-world.json
VOLUME /data
CMD ["node", "server/dist/relay.mjs"]
