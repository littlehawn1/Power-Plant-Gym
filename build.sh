#!/bin/sh
# Assembles the site into _site/ (used by the GitHub Pages workflow and for local testing).
#   /app/    client app      /coach/  coach dashboard      shared/*.js is copied into both
set -e
rm -rf _site
mkdir -p _site/app _site/coach
cp -r client/index.html client/styles.css client/app.js client/exercises.js client/sw.js client/manifest.webmanifest client/icons _site/app/
if [ -d client/videos ]; then cp -r client/videos _site/app/; fi
cp coach/index.html coach/coach.css coach/coach.js _site/coach/
cp shared/*.js _site/app/
cp shared/*.js _site/coach/
printf '<!doctype html><meta charset="utf-8"><title>Power Plant</title><meta http-equiv="refresh" content="0; url=app/"><a href="app/">Open the Power Plant app</a>\n' > _site/index.html
