# Deploy Plutus To Google Compute Engine

This path deploys the current local Plutus code to a Google Compute Engine VM, so the app no longer depends on your laptop tunnel.

## Why this setup

- Uses a single `e2-micro` VM in `us-central1-a`, which fits Google Cloud's always-free Compute Engine tier in eligible accounts.
- Keeps SQLite data on the VM itself under `/var/lib/plutus-data`.
- Uploads the current local repo to the VM directly, so it does not depend on GitHub being up to date.

## Before you run it

1. Create a Google Cloud project.
2. Enable billing on that project.
3. Install the Google Cloud CLI:
   https://cloud.google.com/sdk/docs/install
4. Log in:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## One-command deploy

From the repo root:

```bash
npm run deploy:gce
```

Or:

```bash
GCP_PROJECT_ID=your-project-id bash scripts/deploy-gce.sh
```

What it does:

- creates a firewall rule for HTTP on port `80`
- creates a VM if it does not already exist
- uploads the current Plutus source from this laptop
- installs Docker on the VM
- builds the Plutus container on the VM
- starts the app on port `80`

## Result

When the script finishes, it prints the public URL:

```text
http://EXTERNAL_IP
```

## Important notes

- This gets Plutus off your laptop tunnel, but it is still an HTTP deployment.
- If you want installable PWA behavior, service workers, or a polished production URL, the next step is adding HTTPS with a real domain and reverse proxy.
- SQLite data is stored on the VM at:

```text
/var/lib/plutus-data
```

## Redeploy after app changes

Run the same command again:

```bash
npm run deploy:gce
```

It uploads the latest local code and replaces the running container.

## Default VM settings

- Machine type: `e2-micro`
- Zone: `us-central1-a`
- Image: Debian 12
- Port: `80`

You can override them:

```bash
GCP_PROJECT_ID=your-project-id \
GCE_ZONE=us-west1-b \
GCE_INSTANCE_NAME=plutus-vm \
GCE_MACHINE_TYPE=e2-small \
bash scripts/deploy-gce.sh
```
