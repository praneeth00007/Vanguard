#!/bin/bash

# Test script for Vanguard's Blindside ZK circuits
# Requires: nargo (Noir compiler) installed

set -e

echo "🎮 Vanguard's Blindside - Circuit Testing"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if nargo is installed
if ! command -v nargo &> /dev/null; then
    echo "❌ Error: nargo not found"
    echo "Install Noir: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash"
    exit 1
fi

echo "✅ Nargo version: $(nargo --version)"
echo ""

# Test deployment circuit
echo -e "${BLUE}📦 Testing Deployment Circuit${NC}"
echo "--------------------------------"
cd deployment
echo "Building..."
nargo build
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Test movement circuit
echo -e "${BLUE}🚶 Testing Movement Circuit${NC}"
echo "----------------------------"
cd ../movement
echo "Building..."
nargo build
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Test attack circuit
echo -e "${BLUE}⚔️  Testing Attack Circuit${NC}"
echo "--------------------------"
cd ../attack
echo "Building..."
nargo build
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Summary
echo -e "${GREEN}=========================================="
echo "✅ All circuits built successfully!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Generate proofs: cd <circuit> && nargo prove"
echo "  2. Verify proofs: cd <circuit> && nargo verify"
echo "  3. Export verifier: cd <circuit> && nargo codegen-verifier"
echo ""
echo "Circuits ready for integration with:"
echo "  - Soroban verifier contract (UltraHonk)"
echo "  - Web Worker proof generation (noir_js)"
echo "  - Next.js frontend"
