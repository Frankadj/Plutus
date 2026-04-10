FROM node:20-bookworm-slim

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm --prefix client ci
RUN npm --prefix server ci --omit=dev
RUN npx --prefix server playwright install --with-deps chromium

COPY client ./client
COPY server ./server

RUN npm --prefix client run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "--prefix", "server", "start"]
