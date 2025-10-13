#!/bin/bash

echo "Setting up Hailo AI Accelerator Dashboard"
echo "=========================================="

echo "Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "Checking for Hailo hardware..."
if lspci | grep -i hailo > /dev/null; then
    echo "✓ Hailo device detected"
else
    echo "⚠ Hailo device not detected - service will run in simulation mode"
fi

echo ""
echo "Checking for HailoRT installation..."
if python3 -c "import hailo_platform" 2>/dev/null; then
    echo "✓ HailoRT Python API installed"
else
    echo "⚠ HailoRT Python API not found"
    echo ""
    echo "To install HailoRT on Raspberry Pi 5:"
    echo "  sudo apt update"
    echo "  sudo apt install hailo-all"
    echo ""
fi

echo ""
echo "Creating model directories..."
mkdir -p ~/hailo-models

echo ""
echo "Setup complete!"
echo ""
echo "To start the Hailo service:"
echo "  python3 hailo_service.py"
echo ""
echo "To start the web dashboard:"
echo "  npm run dev"
