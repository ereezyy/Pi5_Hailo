#!/bin/bash

# Hailo AI Dashboard - One-Click Starter
# This script starts both the Python service and web dashboard

echo "🚀 Starting Hailo AI Dashboard..."
echo ""

# Check if we're in the right directory
if [ ! -f "hailo_service.py" ]; then
    echo "❌ Error: Please run this script from the project directory"
    echo "   cd ~/Pi5_Hailo && ./start.sh"
    exit 1
fi

# Kill any existing processes on ports 5000 and 5173
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start Python service in background
echo "🐍 Starting Python Hailo Service (port 5000)..."
python3 hailo_service.py > hailo_service.log 2>&1 &
PYTHON_PID=$!
echo "   Python service PID: $PYTHON_PID"

# Wait for Python service to be ready
echo "⏳ Waiting for Python service to start..."
sleep 3

# Check if Python service is running
if ! ps -p $PYTHON_PID > /dev/null; then
    echo "❌ Python service failed to start. Check hailo_service.log"
    exit 1
fi
echo "✅ Python service started successfully"

# Start web dashboard
echo "🌐 Starting Web Dashboard (port 5173)..."
npm run dev -- --host > web_dashboard.log 2>&1 &
WEB_PID=$!
echo "   Web dashboard PID: $WEB_PID"

# Wait for web server to be ready
echo "⏳ Waiting for web dashboard to start..."
sleep 5

echo ""
echo "✨ Hailo AI Dashboard is starting!"
echo ""
echo "📊 Access your dashboard at:"
echo "   Local:   http://localhost:5173"
echo "   Network: http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "📝 Logs:"
echo "   Python service: tail -f hailo_service.log"
echo "   Web dashboard:  tail -f web_dashboard.log"
echo ""
echo "🛑 To stop everything, run: ./stop.sh"
echo ""
echo "Press Ctrl+C to view logs (services will keep running in background)..."
echo ""

# Show combined logs
tail -f hailo_service.log web_dashboard.log
