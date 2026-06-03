#!/bin/bash
set -e

echo ""
echo "=== Marshall Collage App — Setup ==="
echo ""

# Check node
if ! command -v node &> /dev/null; then
  echo "ERROR: node är inte installerat. Gå till nodejs.org och installera LTS-versionen."
  exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
  echo "ERROR: npm är inte installerat."
  exit 1
fi

echo "✓ node $(node -v)"
echo "✓ npm $(npm -v)"
echo ""

# Install dependencies
echo "--- Installerar paket..."
npm install
echo ""

# Install Vercel CLI if missing
if ! command -v vercel &> /dev/null; then
  echo "--- Installerar Vercel CLI..."
  npm install -g vercel
fi
echo "✓ Vercel CLI $(vercel --version)"
echo ""

# Collect AWS credentials
echo "=== AWS-inställningar ==="
echo "Du hittar dessa i AWS Console → IAM → Users → din användare → Security credentials"
echo ""
read -p "AWS_ACCESS_KEY_ID: " AWS_ACCESS_KEY_ID
read -p "AWS_SECRET_ACCESS_KEY: " AWS_SECRET_ACCESS_KEY
read -p "AWS_REGION (t.ex. eu-north-1): " AWS_REGION
echo ""

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_REGION

# Deploy Remotion Lambda
echo "--- Driftsätter Remotion Lambda-funktion..."
npx remotion lambda functions deploy --region=$AWS_REGION 2>&1 | tee /tmp/remotion-function.txt
FUNCTION_NAME=$(grep -oP '(?<=Function name: )[\w-]+' /tmp/remotion-function.txt || true)

echo ""
echo "--- Skapar Remotion-site..."
npx remotion lambda sites create remotion/src/index.ts --site-name=marshall-collage --region=$AWS_REGION 2>&1 | tee /tmp/remotion-site.txt
SERVE_URL=$(grep -oP 'https://[^\s]+' /tmp/remotion-site.txt | head -1 || true)

echo ""
if [ -z "$FUNCTION_NAME" ] || [ -z "$SERVE_URL" ]; then
  echo "WARNING: Kunde inte automatiskt läsa ut FUNCTION_NAME eller SERVE_URL."
  read -p "Klistra in REMOTION_LAMBDA_FUNCTION_NAME: " FUNCTION_NAME
  read -p "Klistra in REMOTION_SERVE_URL: " SERVE_URL
fi

echo "✓ REMOTION_LAMBDA_FUNCTION_NAME=$FUNCTION_NAME"
echo "✓ REMOTION_SERVE_URL=$SERVE_URL"
echo ""

# Login and deploy to Vercel
echo "=== Vercel-setup ==="
echo "--- Loggar in på Vercel (en webbläsare öppnas)..."
vercel login
echo ""

echo "--- Kopplar projektet till Vercel..."
vercel link --yes
echo ""

echo "--- Lägger till miljövariabler i Vercel..."
echo "$AWS_ACCESS_KEY_ID"     | vercel env add AWS_ACCESS_KEY_ID production --yes 2>/dev/null || true
echo "$AWS_SECRET_ACCESS_KEY" | vercel env add AWS_SECRET_ACCESS_KEY production --yes 2>/dev/null || true
echo "$AWS_REGION"            | vercel env add AWS_REGION production --yes 2>/dev/null || true
echo "$FUNCTION_NAME"         | vercel env add REMOTION_LAMBDA_FUNCTION_NAME production --yes 2>/dev/null || true
echo "$SERVE_URL"             | vercel env add REMOTION_SERVE_URL production --yes 2>/dev/null || true
echo ""

echo "--- Lägger till Vercel Blob-storage..."
echo "OBS: Gå till vercel.com → ditt projekt → Storage → Connect Store → Blob"
echo "     Blob-token läggs till automatiskt när du gör det via dashboarden."
echo ""

echo "--- Deployer till Vercel..."
vercel --prod
echo ""

echo "=== KLART ==="
echo "Din app är nu live på Vercel."
echo "Glöm inte att gå till vercel.com → projektet → Storage och koppla Vercel Blob."
echo ""
