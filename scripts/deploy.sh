#!/usr/bin/env bash
# Deploy to a target environment. CI-agnostic: works from any CI or locally.
# Expects IMAGE to be set in the environment (or passed via CI variables).
set -euo pipefail

ENVIRONMENT="${1:?usage: deploy.sh <environment>}"
IMAGE="${IMAGE:?IMAGE env var must be set}"

echo "==> Deploying ${IMAGE} to ${ENVIRONMENT}"

# Example deploy via Helm. Swap for kubectl / aws cli / etc. as needed.
helm upgrade --install myapp ./chart \
  --namespace "${ENVIRONMENT}" \
  --create-namespace \
  --set image="${IMAGE}" \
  --wait

echo "==> Deploy to ${ENVIRONMENT} complete"
