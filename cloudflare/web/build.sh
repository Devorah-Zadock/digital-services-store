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
  --exclude './cloudflare' --exclude './automate' --exclude './middleware.js' --exclude './vercel.json' \
  --exclude '*.md' --exclude 'node_modules' \
  -cf - . | tar -C "$dist" -xf -
cp "$root/cloudflare/web/_headers" "$dist/_headers"
# DeskKit Automate's app for the pilot: served at /automate-app.html (not
# linked anywhere; the public /automate.html "coming soon" page is untouched).
# The API lets in only accounts on the pilot list — everyone else sees
# "coming soon". q.html is the page a client opens from a quote link; optout.html stops
# a business's automated emails to that client.
sed -e 's#href="automate.html"#href="automate-app.html"#g' \
    -e 's#redirect=automate.html#redirect=automate-app.html#g' \
    "$root/automate/web/automate.html" > "$dist/automate-app.html"
cp "$root/automate/web/q.html" "$root/automate/web/optout.html" "$dist/"
cp "$root/automate/web/js/automate-app.js" "$root/automate/web/js/quote-view.js" "$root/automate/web/js/optout-view.js" "$dist/js/"
echo "built: $(find "$dist" -type f | wc -l) files, $(du -sh "$dist" | cut -f1)"
