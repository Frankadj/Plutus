# Deploy Plutus On Render

This guide is the Render-specific deployment path for Plutus.

## Recommended Render setup

Use a single Docker-based web service.

Why:

- the backend already serves the built frontend
- the repo already includes a working `Dockerfile`
- the app uses SQLite, so it needs a persistent disk

## Important constraint

Plutus currently uses SQLite at runtime.

That means:

- do not use Render free web service for production
- attach a persistent disk
- run only one instance of the app

Render's docs note that free web services use an ephemeral filesystem, and a persistent disk is only available on paid services. Render also notes that a service with an attached disk cannot scale to multiple instances.

## Files already prepared

- `render.yaml`
- `Dockerfile`
- `DEPLOY_RENDER.md`

## What `render.yaml` does

The included Blueprint config creates one web service with:

- runtime: `docker`
- plan: `starter`
- health check: `/api/health`
- `PORT=10000`
- `DB_DIR=/data`
- a persistent disk mounted at `/data`

This works with the current app because `server/index.js` reads:

- `PORT`
- `HOST`
- `DB_DIR`
- `DB_PATH`

## Deploy from the Render dashboard

### Option 1. Blueprint deploy

1. Push this repo to GitHub.
2. In Render, click `New +`.
3. Choose `Blueprint`.
4. Connect your GitHub account if needed.
5. Select the Plutus repo.
6. Render should detect `render.yaml`.
7. Review the service settings.
8. Click `Apply`.

## Manual settings if Render asks

If you create the service manually instead of from Blueprint, use:

- Service type: `Web Service`
- Runtime: `Docker`
- Dockerfile path: `./Dockerfile`
- Branch: `main`
- Instance type: `Starter`
- Health check path: `/api/health`

Environment variables:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=10000`
- `DB_DIR=/data`

Persistent disk:

- Mount path: `/data`
- Size: `1 GB`

## After deploy

When Render finishes, test:

- `/api/health`
- homepage load
- market page
- stock detail page
- news feed

## Notes for this app

- The app depends on outbound access to Kwayisi, GSE, and several news websites.
- The backend uses Playwright/Chromium for some scraping flows, which is why the Docker image installs browser dependencies.
- Because this deploy uses a persistent disk, redeploys are not zero-downtime.

## If you later outgrow SQLite

The long-term production upgrade would be moving from SQLite to Postgres.

That would let you:

- avoid disk coupling
- scale more cleanly
- use more of Render's managed database tooling

For now, though, Render + Docker + one persistent disk is the right setup for the current app.
