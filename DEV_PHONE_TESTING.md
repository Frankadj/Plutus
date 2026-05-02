# Phone Development Testing

This setup is for local development, not production.

## What already works in Plutus

- Frontend Vite dev server listens on `0.0.0.0`
- Backend listens on `0.0.0.0`
- Frontend API requests use relative `/api` by default
- Vite proxies `/api` to the backend, so you do not need to hardcode your laptop IP in normal dev

## Start the app for phone testing

From the repo root:

```bash
npm run start:server
```

In a second terminal:

```bash
npm run dev:client
```

Find your Chromebook/Linux IP:

```bash
hostname -I
```

Example:

```text
100.115.92.201
```

Open this on the phone:

```text
http://100.115.92.201:5173
```

## Why frontend API calls should not use localhost on the phone

On the phone, `localhost` means the phone itself, not your Chromebook.

Plutus avoids that by default because the frontend uses relative `/api` and Vite proxies it to the backend on the Chromebook.

## Optional env support

If you want a direct API base instead of the Vite proxy, copy:

```bash
cp client/.env.development.example client/.env.development
```

Then set:

```text
VITE_API_BASE_URL=http://YOUR_LAPTOP_IP:3001
```

## Hot reload on mobile

On a normal Wi-Fi router where both phone and laptop are peers, Vite HMR should usually work with:

```text
http://YOUR_LAPTOP_IP:5173
```

If HMR websocket connection fails through a tunnel, set:

```text
VITE_HMR_HOST=your-subdomain.ngrok.app
VITE_HMR_PROTOCOL=wss
VITE_HMR_CLIENT_PORT=443
```

Then restart the frontend dev server.

## Chromebook + phone hotspot warning

If your phone is the hotspot provider and the Chromebook is connected to it:

- the phone is not always able to reach the Chromebook as a peer device
- some hotspot setups block client-to-host routing or behave like client isolation
- that means `http://YOUR_LAPTOP_IP:5173` may fail even if the dev server is correct

So if your phone provides the hotspot, local-IP testing may not work reliably.

## Fallback with ngrok

Official ngrok docs: https://ngrok.com/docs/getting-started/index

Install ngrok, authenticate it, then expose the Vite dev server:

```bash
ngrok http 5173
```

If you only need the backend:

```bash
ngrok http 3001
```

If you tunnel the frontend and want HMR to keep working through the public URL, use:

```text
VITE_HMR_HOST=your-subdomain.ngrok.app
VITE_HMR_PROTOCOL=wss
VITE_HMR_CLIENT_PORT=443
```

Then restart:

```bash
npm run dev:client
```

## Commands summary

Backend:

```bash
npm run start:server
```

Frontend:

```bash
npm run dev:client
```

Find IP:

```bash
hostname -I
```

Tunnel frontend with ngrok:

```bash
ngrok http 5173
```
