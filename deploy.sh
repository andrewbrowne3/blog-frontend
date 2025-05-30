#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the blog-frontend directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install || { echo "❌ Failed to install dependencies"; exit 1; }

echo "🔧 Building app..."
npm run build || { echo "❌ Build failed"; exit 1; }

echo "🗂️  Creating deployment directory if it doesn't exist..."
sudo mkdir -p /var/www/Blog-Generator || { echo "❌ Failed to create deployment directory"; exit 1; }

echo "🧹 Cleaning old deployment..."
sudo rm -rf /var/www/Blog-Generator/* || { echo "❌ Failed to clean old deployment"; exit 1; }

echo "📁 Deploying files to server..."
sudo cp -rp build/* /var/www/Blog-Generator/ || { echo "❌ Failed to copy files to server"; exit 1; }

echo "🔐 Setting proper permissions..."
sudo chown -R ab:www-data /var/www/Blog-Generator/ || { echo "❌ Failed to set permissions"; exit 1; }
sudo chmod -R 755 /var/www/Blog-Generator/ || { echo "❌ Failed to set file permissions"; exit 1; }

echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be available at your configured domain"

