#!/usr/bin/env bash
# Publishes a client preview of site/ to GitHub Pages (gh-pages branch).
#   bash publish-preview.sh
# Preview URL: https://jahangirsachwani.github.io/zanctok-website/
# The preview is marked noindex so Google does not treat it as a copy of zanctok.com.
# Note: PHP forms do not work on GitHub Pages (preview only).
set -euo pipefail
cd "$(dirname "$0")"
node build.js > /dev/null

TMP="$(mktemp -d)"
cp -r site/. "$TMP/"
rm -rf "$TMP/forms/data" "$TMP/.htaccess" "$TMP/forms/.htaccess" "$TMP/robots.txt" "$TMP/sitemap.xml"
touch "$TMP/.nojekyll"

for f in "$TMP"/*.html; do
  sed -i 's#<meta charset="utf-8">#<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">#' "$f"
  sed -i 's#<base href="/">#<base href="/zanctok-website/">#' "$f"
done

REMOTE="$(git remote get-url origin)"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Client preview $(date +%Y-%m-%d)"
git push -f "$REMOTE" gh-pages
cd - > /dev/null
rm -rf "$TMP"
echo "Preview published: https://jahangirsachwani.github.io/zanctok-website/"
