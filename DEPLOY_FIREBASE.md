# Firebase Hosting + Cloud Run

This project keeps Vite for the frontend build and uses:

- Firebase Hosting for the static frontend in `client/dist`
- Cloud Run for the Express backend
- A Firebase Hosting rewrite so `/api/**` is proxied to the Cloud Run service

## One-time setup

Install the CLIs and log in:

```bash
npm install -g firebase-tools
firebase login
gcloud auth login
gcloud config set project gen-lang-client-0604880622
```

If you have not initialized Hosting yet, run:

```bash
firebase init hosting
```

Use these answers:

- Select project: `gen-lang-client-0604880622`
- Public directory: `client/dist`
- Configure as single-page app: `Yes`
- Set up automatic builds and deploys with GitHub: `No` unless you want CI
- If asked to overwrite `index.html`: `No`

## Deploy the backend

Deploy the Express server to Cloud Run as `plutus-api`:

```bash
gcloud run deploy plutus-api --source . --region us-central1 --allow-unauthenticated --set-env-vars NODE_ENV=production
```

Or use the package script:

```bash
npm run deploy:api
```

The current `firebase.json` expects:

- service ID: `plutus-api`
- region: `us-central1`

If you choose a different service name or region, update `firebase.json` to match.

## Deploy the frontend

Build the Vite app:

```bash
npm run build
```

Deploy Hosting:

```bash
firebase deploy --only hosting
```

Or use the helper script:

```bash
npm run deploy:firebase
```

## Why this works

- Vite still builds the frontend into `client/dist`
- Firebase Hosting serves `client/dist`
- `/api/**` is rewritten by Hosting to the Cloud Run backend
- All non-API routes rewrite to `/index.html` for SPA routing

## Firebase Auth note

If this app later uses Firebase Auth, add these Hosting domains to Authorized Domains:

- `gen-lang-client-0604880622.web.app`
- `gen-lang-client-0604880622.firebaseapp.com`
