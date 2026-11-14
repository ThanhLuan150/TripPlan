#!/usr/bin/env bash
# Runs ON THE SERVER (copied there by .github/workflows/cd.yml):
#   ./deploy.sh <image-tag>
# Pulls the images of that tag, restarts the stack, waits for both containers
# to be healthy and rolls back to the previously deployed tag if they are not.
set -euo pipefail

TAG="${1:?usage: deploy.sh <image-tag>}"
cd "$(dirname "$0")"

if [[ ! -f backend/.env ]]; then
  echo "::error::$(pwd)/backend/.env is missing (copy backend/.env.example and fill it in)"
  exit 1
fi

PREVIOUS="$(cat .deployed_tag 2>/dev/null || true)"

up() {
  IMAGE_TAG="$1" docker compose pull --quiet
  IMAGE_TAG="$1" docker compose up -d --remove-orphans
}

# healthy | unhealthy | starting | ... for a compose service
health() {
  local id
  id="$(docker compose ps -q "$1")"
  [[ -n "$id" ]] && docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" || echo "missing"
}

wait_healthy() {
  local backend web
  for _ in $(seq 1 36); do # up to 3 minutes
    backend="$(health backend)"
    web="$(health web)"
    echo "backend: $backend, web: $web"
    if [[ "$backend" == "healthy" && "$web" == "healthy" ]]; then
      return 0
    fi
    sleep 5
  done
  return 1
}

echo "Deploying $TAG (previous: ${PREVIOUS:-none})"
up "$TAG"

if wait_healthy; then
  echo "$TAG" > .deployed_tag
  docker image prune -f > /dev/null
  echo "Deployed $TAG"
  exit 0
fi

echo "::error::$TAG is not healthy"
docker compose logs --tail=80 backend web || true
if [[ -n "$PREVIOUS" && "$PREVIOUS" != "$TAG" ]]; then
  echo "Rolling back to $PREVIOUS"
  up "$PREVIOUS"
  wait_healthy || echo "::error::rollback to $PREVIOUS is not healthy either"
fi
exit 1
