#!/usr/bin/env bash
set -euo pipefail
export NODE_OPTIONS="--max-old-space-size=16384"
export BUILD_DATE="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
npx docusaurus build --no-minify
