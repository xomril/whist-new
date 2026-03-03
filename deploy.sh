#!/bin/bash
# Run this on the Oracle VM to update the app after pushing to GitHub
# Usage: ./deploy.sh

set -e
cd /home/opc/whist

echo "→ Pulling latest code..."
git pull

echo "→ Building client..."
cd client && npm install --registry https://registry.npmjs.org && npm run build && cd ..

echo "→ Building server..."
cd server && npm install --registry https://registry.npmjs.org && npm run build && cd ..

echo "→ Restarting app..."
mkdir -p logs
pm2 restart whist || pm2 start ecosystem.config.cjs

echo "✓ Done. App is live."
pm2 status
