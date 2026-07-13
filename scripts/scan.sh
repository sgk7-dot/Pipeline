#!/usr/bin/env bash
# Security / quality scan. CI-agnostic: works from any CI or locally.
set -euo pipefail

IMAGE="${1:?usage: scan.sh <image-tag>}"

echo "==> Scanning filesystem for vulnerabilities"
trivy fs --exit-code 1 --severity HIGH,CRITICAL .

echo "==> Scanning image: ${IMAGE}"
trivy image --exit-code 1 --severity HIGH,CRITICAL "${IMAGE}"

echo "==> Scan complete"
