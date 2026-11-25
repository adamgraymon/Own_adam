# Contenedor ligero y aislado para desplegar el Nodo M2M en la nube (Render / Railway / Fly.io)
# Garantiza que ningún tráfico público de Internet toque tu computadora personal.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY contracts ./contracts
RUN mkdir -p ./artifacts && chown -R node:node /app
COPY --chown=node:node SECURITY.md README.md server.json ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src

ENV NODE_ENV=production
ENV PORT=3402

USER node

EXPOSE 3402

CMD ["node", "src/server.js"]
