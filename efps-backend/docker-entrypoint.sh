#!/bin/sh
set -e

echo "Running database migrations..."
node dist/scripts/migrate.js

echo "Seeding test data..."
node dist/scripts/seed.js 2>/dev/null || echo "Seed data already exists (skipping)"

echo "Starting application..."
exec "$@"
