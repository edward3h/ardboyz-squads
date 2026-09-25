#!/usr/bin/env bash
# Build the site, then publish it. Use `amber build.ab` alone for a local build.
set -euo pipefail
cd "$(dirname "$0")"

amber build.ab
rsync -avz index.html static ordoacerbus:squads.ordoacerbus.com/
