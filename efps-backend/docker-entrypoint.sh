#!/bin/sh
set -e

echo "Running database migrations..."
node dist/scripts/migrate.js

if [ "$NODE_ENV" != "production" ]; then
  echo "Seeding test data (dev only)..."
  node dist/scripts/seed.js 2>/dev/null || echo "Seed data already exists (skipping)"
fi

echo "Starting application..."
exec "$@"
