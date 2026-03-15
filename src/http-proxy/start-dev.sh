#!/bin/bash

# Guojiajia HTTP Proxy - Development Start Script

echo "🚀 Starting Guojiajia HTTP Proxy..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, copying from .env.example"
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🔧 Starting development server..."
npm run dev
