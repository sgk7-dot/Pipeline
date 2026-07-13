#!/usr/bin/env bash
# Build a container image. CI-agnostic: works from any CI or locally.
set -euo pipefail

IMAGE="${1:?usage: build.sh <image-tag>}"

echo "==> Building image: ${IMAGE}"
docker build -t "${IMAGE}" .

echo "==> Build complete: ${IMAGE}"
