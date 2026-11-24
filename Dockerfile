FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY db ./db
COPY shared ./shared
COPY client ./client
COPY dashboard ./dashboard
COPY scripts ./scripts
COPY assets/*.webp ./assets/
COPY index.html styles.css game.js words.js definitions.js story.js story-content.js realm-maps.js ./
RUN chown -R node:node /app
USER node
ENV NODE_ENV=production
CMD ["node", "server/app.js"]
