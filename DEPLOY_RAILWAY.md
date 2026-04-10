# Deploy Plutus On Railway

This app is ready to deploy as a single web service on Railway.

## Why Railway

- The app serves the built frontend from the Node backend.
- The backend uses SQLite via `better-sqlite3`.
- Railway supports a persistent volume, which lets the SQLite database survive restarts and redeploys.
- Railway supports Dockerfile-based services, which is useful here because the backend also uses Playwright/Chromium for some scraping tasks.

## What To Create In Railway

1. Create a new project.
2. Create one service from this repo.
3. Add a volume and mount it to:
   - `/data`
4. Railway should expose the service automatically on a public domain.

## Environment Variables

No custom variables are strictly required for the first deploy.

This repo already handles:

- `PORT` from Railway automatically
- `HOST` defaulting to `::`
- SQLite persistence from Railway's automatic `RAILWAY_VOLUME_MOUNT_PATH`

You can still set `NODE_ENV=production` explicitly if you want, but the Docker image already defaults to production mode.

## Start Behavior

This repo includes:

- a root `Dockerfile`
- a root `railway.toml`

So Railway can deploy it directly as a Docker service with config-as-code.

The container:

- installs the client and server dependencies
- installs Chromium and its Linux dependencies for Playwright
- builds the Vite frontend
- starts the Express backend on port `3001`

## Health Check

Use this health check path if you want one:

- `/api/health`

## Important Notes

- The SQLite database file will be stored as `/data/plutus.db` in Railway.
- Without the mounted volume, data will be lost on redeploy or restart.
- If you later move to Postgres, you can keep the same deployment shape and just replace the database layer.

## After Deploy

Once Railway gives you the public URL:

1. Open the URL in your phone browser.
2. Use `Add to Home Screen`.
3. That gives you the app-like install flow without tunnels.

## APK After Deploy

Once the Railway domain exists, rebuild the Android app against that permanent backend:

```bash
VITE_API_BASE=https://your-plutus-domain.up.railway.app npm run android:sync
cd android
JAVA_HOME=/home/frankopare12/projects/plutus/jdk-21 \
ANDROID_HOME=/home/frankopare12/projects/plutus/android-sdk \
ANDROID_SDK_ROOT=/home/frankopare12/projects/plutus/android-sdk \
./gradlew assembleDebug
```

That gives you an APK that no longer depends on your laptop or a tunnel.
