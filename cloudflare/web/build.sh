#!/usr/bin/env bash
# Copies the public site into cloudflare/web/dist — everything except the
# repository's own tooling, server code and docs.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
dist="$root/cloudflare/web/dist"
rm -rf "$dist"
mkdir -p "$dist"
tar -C "$root" \
  --exclude './.git' --exclude './.github' --exclude './supabase' --exclude './api' \
  --exclude './cloudflare' --exclude './middleware.js' --exclude './vercel.json' \
  --exclude '*.md' --exclude 'node_modules' \
  -cf - . | tar -C "$dist" -xf -
cp "$root/cloudflare/web/_headers" "$dist/_headers"
echo "built: $(find "$dist" -type f | wc -l) files, $(du -sh "$dist" | cut -f1)"
