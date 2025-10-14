#!/bin/bash

# Hailo AI Dashboard - Stop Script

echo "🛑 Stopping Hailo AI Dashboard..."
echo ""

# Kill processes on ports 5000 and 5173
echo "Stopping Python service (port 5000)..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || echo "   No process found on port 5000"

echo "Stopping Web dashboard (port 5173)..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || echo "   No process found on port 5173"

# Also kill by process name as backup
pkill -f "hailo_service.py" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo ""
echo "✅ All services stopped"
