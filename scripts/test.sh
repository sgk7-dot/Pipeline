#!/usr/bin/env bash
# Run the test suite. CI-agnostic: works from any CI or locally.
set -euo pipefail

echo "==> Installing dependencies"
npm ci

echo "==> Running tests"
npm test

echo "==> Tests passed"
