#!/usr/bin/env bash
# Setup script for Trento Live Activity backend.
# Idempotent: safe to run multiple times.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

DB_NAME="${DB_NAME:-trento_live}"
DB_USER="${DB_USER:-trento}"
DB_PASS="${DB_PASS:-trento}"

echo "==> Trento Live Activity — backend setup"

# 1. PostgreSQL
if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: PostgreSQL is not installed."
  echo "  Ubuntu/Debian:  sudo apt install postgresql"
  echo "  macOS:          brew install postgresql && brew services start postgresql"
  exit 1
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1; then
  echo "==> Creating PostgreSQL user '$DB_USER'"
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
  echo "==> PostgreSQL user '$DB_USER' already exists"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
  echo "==> Creating database '$DB_NAME'"
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
else
  echo "==> Database '$DB_NAME' already exists"
fi

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >/dev/null

# 2. .env
if [ ! -f .env ]; then
  echo "==> Creating .env"
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '/+=' | head -c 64)
  cat > .env <<EOF
# Database
DATABASE_URL=postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# SMTP (Nodemailer) — leave empty in dev: emails will be logged to console
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Trento Live Activity <noreply@example.com>"

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Apple OAuth
APPLE_CLIENT_ID=

# Firebase Cloud Messaging
# Leave empty to log push notifications to console (stub mode).
# Set to the path of your Firebase service account JSON file to enable real push.
FIREBASE_CREDENTIALS_PATH=

# Maps
MAPS_API_KEY=
EOF
else
  echo "==> .env already exists, leaving as is"
fi

# 3. npm install
if [ ! -d node_modules ]; then
  echo "==> Installing dependencies (npm install)"
  npm install
else
  echo "==> node_modules already present, skipping npm install"
fi

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  npm run dev      # start the server (creates/updates tables automatically)"
echo "  npm run seed     # populate the database with sample data"
