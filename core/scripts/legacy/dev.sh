#!/usr/bin/env bash
set -euo pipefail
export NODE_OPTIONS="--max-old-space-size=16384"
export BUILD_DATE="dev"
npx docusaurus start
