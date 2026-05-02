#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="${1:-$HOME/plutus-deploy.tar.gz}"
APP_DIR="/opt/plutus"
DATA_DIR="/var/lib/plutus-data"

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Archive not found: $ARCHIVE_PATH" >&2
  exit 1
fi

if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
fi

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get install -y ca-certificates curl git docker.io
sudo systemctl enable --now docker

sudo mkdir -p "$APP_DIR" "$DATA_DIR"
sudo rm -rf "$APP_DIR"/*
sudo tar -xzf "$ARCHIVE_PATH" -C "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

cd "$APP_DIR"

sudo docker build -t plutus:latest .
sudo docker rm -f plutus >/dev/null 2>&1 || true
sudo docker run -d \
  --name plutus \
  --restart unless-stopped \
  -p 80:3001 \
  -e NODE_ENV=production \
  -e DB_DIR=/data \
  -v "$DATA_DIR:/data" \
  plutus:latest

sudo docker image prune -f >/dev/null 2>&1 || true
sudo docker ps --filter name=plutus

