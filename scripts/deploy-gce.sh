#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_ID="${GCP_PROJECT_ID:-}"
ZONE="${GCE_ZONE:-us-central1-a}"
INSTANCE_NAME="${GCE_INSTANCE_NAME:-plutus-vm}"
MACHINE_TYPE="${GCE_MACHINE_TYPE:-e2-micro}"
IMAGE_FAMILY="${GCE_IMAGE_FAMILY:-debian-12}"
IMAGE_PROJECT="${GCE_IMAGE_PROJECT:-debian-cloud}"
FIREWALL_RULE="${GCE_FIREWALL_RULE:-plutus-http}"
TAG="${GCE_TAG:-plutus-web}"
REMOTE_ARCHIVE="~/plutus-deploy.tar.gz"
REMOTE_SCRIPT="~/remote-install.sh"
TMP_ARCHIVE="$(mktemp /tmp/plutus-gce-XXXXXX.tar.gz)"

cleanup() {
  rm -f "$TMP_ARCHIVE"
}
trap cleanup EXIT

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is not installed. Install it first: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "Set GCP_PROJECT_ID or run: gcloud config set project YOUR_PROJECT_ID" >&2
  exit 1
fi

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [[ -z "$ACTIVE_ACCOUNT" ]]; then
  echo "No active gcloud account. Run: gcloud auth login" >&2
  exit 1
fi

echo "Using Google Cloud project: $PROJECT_ID"
echo "Using zone: $ZONE"

if ! gcloud compute firewall-rules describe "$FIREWALL_RULE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "$FIREWALL_RULE" \
    --project "$PROJECT_ID" \
    --allow tcp:80 \
    --target-tags "$TAG" \
    --description "Allow HTTP access to Plutus"
fi

if ! gcloud compute instances describe "$INSTANCE_NAME" --zone "$ZONE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud compute instances create "$INSTANCE_NAME" \
    --project "$PROJECT_ID" \
    --zone "$ZONE" \
    --machine-type "$MACHINE_TYPE" \
    --image-family "$IMAGE_FAMILY" \
    --image-project "$IMAGE_PROJECT" \
    --boot-disk-size 20GB \
    --boot-disk-type pd-standard \
    --tags "$TAG"
fi

tar --exclude-from="$PROJECT_ROOT/ops/gce/tar-excludes.txt" -czf "$TMP_ARCHIVE" -C "$PROJECT_ROOT" .

gcloud compute scp "$TMP_ARCHIVE" "${INSTANCE_NAME}:${REMOTE_ARCHIVE}" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --quiet

gcloud compute scp "$PROJECT_ROOT/ops/gce/remote-install.sh" "${INSTANCE_NAME}:${REMOTE_SCRIPT}" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --quiet

gcloud compute ssh "$INSTANCE_NAME" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --command "chmod +x $REMOTE_SCRIPT && $REMOTE_SCRIPT $REMOTE_ARCHIVE"

EXTERNAL_IP="$(gcloud compute instances describe "$INSTANCE_NAME" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"

echo
echo "Plutus should be reachable at:"
echo "http://$EXTERNAL_IP"

