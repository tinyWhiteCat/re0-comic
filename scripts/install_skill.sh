#!/usr/bin/env bash
set -euo pipefail
export npm_config_cache="${TMPDIR:-/tmp}/re0-npm-cache"
cd "$(dirname "$0")/.."
revision=43bd349a136651865ecfa6ea1cf012f6e957d304
target="$PWD/.agents/skills/video-shotcraft"
if [ ! -f "$target/SKILL.md" ]; then
  mkdir -p "$(dirname "$target")"
  staging=$(mktemp -d)
  trap 'rm -rf "$staging"' EXIT
  git -C "$staging" init -q
  git -C "$staging" remote add origin https://github.com/Vincentwei1021/video-shotcraft.git
  git -C "$staging" fetch --depth=1 origin "$revision"
  git -C "$staging" checkout --detach FETCH_HEAD
  test "$(git -C "$staging" rev-parse HEAD)" = "$revision"
  rm -rf "$staging/.git"
  # Refuse to overwrite an existing, incomplete installation.
  test ! -e "$target"
  mv "$staging" "$target"
fi
npm ci --prefix "$target"
npm ci --prefix "$target/template"
npm test --prefix "$target"
printf 'video-shotcraft installed: %s\n' "$target"
