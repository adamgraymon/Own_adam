# Contenedor ligero y aislado para desplegar el Nodo M2M en la nube (Render / Railway / Fly.io)
# Garantiza que ningún tráfico público de Internet toque tu computadora personal.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY contracts ./contracts
RUN mkdir -p ./artifacts
COPY public ./public
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3402

EXPOSE 3402

CMD ["node", "src/server.js"]
