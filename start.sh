#!/bin/bash

echo "🚀 Starting AI Blog Generator..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if ports are available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use. Stopping existing service..."
    pkill -f "npm start" || true
    sleep 2
fi

if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 4000 is already in use. Stopping existing service..."
    pkill -f "uvicorn" || true
    sleep 2
fi

echo "🔧 Building and starting services with Docker Compose..."
docker-compose up --build -d

echo ""
echo "✅ Services started successfully!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:4000"
echo ""
echo "📝 To stop the services, run: docker-compose down"
echo "📊 To view logs, run: docker-compose logs -f"
echo ""
echo "�� Happy blogging!" 