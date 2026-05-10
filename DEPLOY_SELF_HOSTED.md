# Deploy Plutus On A Self-Hosted Server

This document is for a server or DevOps team that wants to host Plutus outside Firebase, Railway, or Google Cloud.

## What this app is

Plutus is a full-stack web app with:

- a Vite-built React frontend in `client`
- an Express backend in `server`
- a SQLite database file used by the backend
- one production server process that serves both:
  - the frontend
  - the `/api/*` backend routes

In production, the frontend should be served by the Express server after the Vite build has been created. Because of that, no separate frontend hosting platform is required for a normal self-hosted deployment.

## Recommended deployment path

Use Docker.

The repo already includes a working `Dockerfile`, and this is the cleanest handoff for another team because:

- Node and Chromium dependencies are installed in a predictable way
- the backend and built frontend run together in one container
- SQLite persistence can be handled with a mounted volume

## Important files

The hosting team should care about these files first:

- `Dockerfile`
- `docker-compose.selfhost.yml`
- `.env.selfhost.example`
- `package.json`
- `client/package.json`
- `server/package.json`
- `client/vite.config.ts`
- `server/index.js`
- `server/plutus.db`

## Runtime behavior

- Default application port: `3001`
- Health endpoint: `/api/health`
- Default bind host: `0.0.0.0`
- SQLite database path:
  - defaults to `server/plutus.db` if no override is provided
  - can be overridden with `DB_DIR` or `DB_PATH`

## Required outbound access

The server needs outbound internet access to external data sources, including:

- `https://dev.kwayisi.org`
- `https://afx.kwayisi.org`
- `https://gse.com.gh`
- `https://www.graphic.com.gh`
- `https://www.ghanaweb.com`
- `https://www.pulse.com.gh`
- `https://www.myjoyonline.com`
- `https://3news.com`
- `https://thebftonline.com`
- `https://www.ghanabusinessnews.com`
- `https://www.newsghana.com.gh`
- `https://en.wikipedia.org`

If the hosting team has strict firewall rules, these outbound destinations matter.

## Why Chromium is included

The backend uses Playwright and headless Chromium for some scraping flows, especially Ghana Stock Exchange press release extraction.

That is why the Docker image installs Chromium dependencies during build.

## Fastest deployment

### 1. Copy the project to the server

Send the source bundle or the repo contents to the server team.

### 2. Create the env file

Copy `.env.selfhost.example` to `.env.selfhost` and adjust values if needed.

Default values are already safe for a basic deployment.

### 3. Start with Docker Compose

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

### 4. Verify health

```bash
curl http://SERVER_IP:3001/api/health
```

Expected result:

```json
{"ok":true,"uptime":123,"storage":"/data"}
```

The `storage` path depends on the configured database mount.

## Reverse proxy

For a real public deployment, the app should sit behind a reverse proxy such as:

- Nginx
- Caddy
- Traefik

Recommended proxy behavior:

- terminate HTTPS at the proxy
- forward all requests to `http://127.0.0.1:3001`
- preserve WebSocket support if the team uses a dev or preview tunnel

Because the Node app serves both the frontend and the API, the proxy can forward the whole site to the same upstream.

## Docker Compose notes

The provided compose file:

- builds from the local repo
- exposes port `3001`
- mounts a persistent Docker volume at `/data`
- sets `DB_DIR=/data`
- restarts automatically unless manually stopped

That means SQLite data survives container restarts and rebuilds.

## Updating the deployment

After source changes:

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

## Manual non-Docker deployment

If the hosting team does not want Docker, these are the minimum steps:

### Requirements

- Node.js 20.x
- npm
- system libraries required by Playwright Chromium

### Install dependencies

```bash
npm --prefix client ci
npm --prefix server ci --omit=dev
npx --prefix server playwright install --with-deps chromium
```

### Build the frontend

```bash
npm --prefix client run build
```

### Start the backend

```bash
HOST=0.0.0.0 PORT=3001 DB_DIR=/var/lib/plutus npm --prefix server start
```

The backend will serve the already-built frontend from `client/dist`.

## Environment variables

Supported runtime variables:

- `HOST`
  - optional
  - default: `0.0.0.0`
- `PORT`
  - optional
  - default: `3001`
- `DB_DIR`
  - optional
  - directory used to store `plutus.db`
- `DB_PATH`
  - optional
  - full explicit path to the SQLite file

## Notes for this repo

- The cloud-specific files like `firebase.json`, `.firebaserc`, and `DEPLOY_FIREBASE.md` are not needed for self-hosting.
- The current production path no longer needs `VITE_API_BASE` if the Express server serves the frontend and API together on the same origin.
- `server/plutus.db` is included in the repo today. The hosting team can start with it or replace it with a clean file if they want a fresh database.

## Handoff checklist

- Send the source files or the prepared archive
- Include this file: `DEPLOY_SELF_HOSTED.md`
- Include `docker-compose.selfhost.yml`
- Include `.env.selfhost.example`
- Tell the hosting team the preferred path is Docker
- Tell them the app needs outbound access to Kwayisi, GSE, and news sites
