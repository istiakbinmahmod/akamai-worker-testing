#!/bin/bash

# Akamai EdgeWorker Bundle Script
# This script creates a tarball bundle for deployment

set -e

echo "🚀 Creating Akamai EdgeWorker Bundle..."

# Check if required files exist
if [ ! -f "main.js" ]; then
    echo "❌ Error: main.js not found"
    exit 1
fi

if [ ! -f "bundle.json" ]; then
    echo "❌ Error: bundle.json not found"
    exit 1
fi

# Download EdgeKV libraries if not present
if [ ! -f "edgekv.js" ]; then
    echo "📦 Downloading EdgeKV library..."
    curl -o edgekv.js https://raw.githubusercontent.com/akamai/edgeworkers-examples/master/edgekv/lib/edgekv.js
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to download edgekv.js"
        echo "Please download it manually from:"
        echo "https://github.com/akamai/edgeworkers-examples/tree/master/edgekv/lib"
        exit 1
    fi
    echo "✅ EdgeKV library downloaded"
fi

if [ ! -f "edgekv_tokens.js" ]; then
    echo "📦 Downloading EdgeKV tokens library..."
    curl -o edgekv_tokens.js https://raw.githubusercontent.com/akamai/edgeworkers-examples/master/edgekv/lib/edgekv_tokens.js
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to download edgekv_tokens.js"
        echo "Please download it manually from:"
        echo "https://github.com/akamai/edgeworkers-examples/tree/master/edgekv/lib"
        exit 1
    fi
    echo "✅ EdgeKV tokens library downloaded"
fi

# Remove old bundle if exists
if [ -f "edgeworker-bundle.tgz" ]; then
    echo "🗑️  Removing old bundle..."
    rm edgeworker-bundle.tgz
fi

# Create tarball
echo "📦 Creating tarball bundle..."
tar -czvf edgeworker-bundle.tgz main.js bundle.json edgekv.js edgekv_tokens.js

if [ $? -eq 0 ]; then
    echo "✅ Bundle created successfully: edgeworker-bundle.tgz"
    echo ""
    echo "📋 Bundle contents:"
    tar -tzf edgeworker-bundle.tgz
    echo ""
    echo "📊 Bundle size:"
    ls -lh edgeworker-bundle.tgz | awk '{print $5}'
    echo ""
    echo "✨ Next steps:"
    echo "1. Upload bundle: akamai edgeworkers upload --bundle edgeworker-bundle.tgz YOUR_EDGEWORKER_ID"
    echo "2. Activate on staging: akamai edgeworkers activate YOUR_EDGEWORKER_ID --network STAGING --version VERSION"
    echo "3. Test on staging"
    echo "4. Activate on production: akamai edgeworkers activate YOUR_EDGEWORKER_ID --network PRODUCTION --version VERSION"
else
    echo "❌ Error: Failed to create bundle"
    exit 1
fi
