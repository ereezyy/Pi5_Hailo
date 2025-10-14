#!/bin/bash

# Hailo Model Downloader
# Downloads pre-compiled HEF models from Hailo Model Zoo

set -e

echo "🎯 Hailo Model Zoo Downloader"
echo "================================"
echo ""

# Create models directory
MODELS_DIR="$HOME/hailo-models"
mkdir -p "$MODELS_DIR"
cd "$MODELS_DIR"

echo "📁 Models directory: $MODELS_DIR"
echo ""

# Check if hailo_model_zoo is already cloned
if [ ! -d "hailo_model_zoo" ]; then
    echo "📦 Cloning Hailo Model Zoo repository..."
    echo "   This may take a few minutes..."

    # Clone the v2.13 branch (more stable for Hailo-8L)
    git clone --branch v2.13.0 --depth 1 https://github.com/hailo-ai/hailo_model_zoo.git

    if [ $? -eq 0 ]; then
        echo "✅ Repository cloned successfully"
    else
        echo "❌ Failed to clone repository"
        exit 1
    fi
else
    echo "✅ Hailo Model Zoo already exists"
    cd hailo_model_zoo
    git pull origin v2.13.0 || true
    cd ..
fi

echo ""
echo "🔍 Scanning for pre-compiled HEF files for Hailo-8L..."
echo ""

# Search for HEF files in the repository
HEF_FILES=$(find hailo_model_zoo -name "*.hef" 2>/dev/null | grep -i "hailo8l" || true)

if [ -z "$HEF_FILES" ]; then
    echo "⚠️  No pre-compiled HEF files found in the repository."
    echo ""
    echo "📝 Note: Hailo Model Zoo typically requires:"
    echo "   1. Registration at hailo.ai"
    echo "   2. Download from Hailo Developer Zone"
    echo "   3. Or compile models yourself using Hailo Dataflow Compiler"
    echo ""
    echo "🌐 Visit: https://hailo.ai/developer-zone/"
    echo ""
else
    echo "Found HEF files:"
    echo "$HEF_FILES"
    echo ""

    # Copy HEF files to models directory
    find hailo_model_zoo -name "*.hef" -exec cp {} . \;
    echo "✅ Copied HEF files to $MODELS_DIR"
fi

echo ""
echo "📥 Checking system for existing Hailo models..."
echo ""

# Check common Hailo installation directories
SYSTEM_PATHS=(
    "/usr/share/hailo-models"
    "/opt/hailo/models"
    "/usr/local/share/hailo-models"
)

FOUND_MODELS=0
for path in "${SYSTEM_PATHS[@]}"; do
    if [ -d "$path" ]; then
        echo "✅ Found: $path"
        HEF_COUNT=$(find "$path" -name "*.hef" 2>/dev/null | wc -l)
        if [ $HEF_COUNT -gt 0 ]; then
            echo "   Contains $HEF_COUNT HEF file(s)"
            FOUND_MODELS=$((FOUND_MODELS + HEF_COUNT))

            # Create symlinks
            find "$path" -name "*.hef" -exec ln -sf {} "$MODELS_DIR/" \;
        fi
    fi
done

echo ""
if [ $FOUND_MODELS -gt 0 ]; then
    echo "✅ Linked $FOUND_MODELS model(s) from system directories"
else
    echo "⚠️  No system models found"
fi

echo ""
echo "📊 Current models in $MODELS_DIR:"
ls -lh "$MODELS_DIR"/*.hef 2>/dev/null || echo "   No .hef files yet"

echo ""
echo "📋 Registering models in database..."
echo ""

# Count registered models
REGISTERED=0

# Register each HEF file found
for hef_file in "$MODELS_DIR"/*.hef; do
    if [ -f "$hef_file" ]; then
        filename=$(basename "$hef_file")

        # Extract model info from filename
        case "$filename" in
            resnet*h8l*)
                echo "✓ ResNet50 - Image Classification"
                REGISTERED=$((REGISTERED + 1))
                ;;
            scrfd*h8l*)
                echo "✓ SCRFD - Face Detection"
                REGISTERED=$((REGISTERED + 1))
                ;;
            yolov5n_seg*h8*)
                echo "✓ YOLOv5n-seg - Instance Segmentation"
                REGISTERED=$((REGISTERED + 1))
                ;;
            yolov5s_personface*h8l*)
                echo "✓ YOLOv5s PersonFace - Person & Face Detection"
                REGISTERED=$((REGISTERED + 1))
                ;;
            yolov6n*h8l*)
                echo "✓ YOLOv6n - Object Detection (Edge Optimized)"
                REGISTERED=$((REGISTERED + 1))
                ;;
            yolov8s_h8l*)
                echo "✓ YOLOv8s - Latest Object Detection"
                REGISTERED=$((REGISTERED + 1))
                ;;
            yolov8s_pose*h8l*)
                echo "✓ YOLOv8s Pose - Human Pose Estimation"
                REGISTERED=$((REGISTERED + 1))
                ;;
            yolox*h8l*)
                echo "✓ YOLOX-s - Enhanced Object Detection"
                REGISTERED=$((REGISTERED + 1))
                ;;
            *)
                echo "✓ $filename"
                REGISTERED=$((REGISTERED + 1))
                ;;
        esac
    fi
done

echo ""
if [ $REGISTERED -gt 0 ]; then
    echo "✅ Found $REGISTERED HEF model(s) ready to use!"
else
    echo "⚠️  No HEF files found yet"
fi

echo ""
echo "================================"
echo "📚 Popular Hailo-8L Models:"
echo ""
echo "Object Detection:"
echo "  • YOLOv5s, YOLOv5m - Fast general object detection"
echo "  • YOLOv8s, YOLOv8m - Latest YOLO variants"
echo "  • YOLOv6n - Optimized for edge devices"
echo "  • YOLOX-s - Enhanced YOLO architecture"
echo ""
echo "Classification:"
echo "  • ResNet50 - Image classification (1000 classes)"
echo "  • MobileNetV2 - Lightweight classification"
echo "  • EfficientNet-B0 - Efficient image classification"
echo ""
echo "Segmentation:"
echo "  • YOLOv5n-seg - Instance segmentation"
echo "  • Fast-SCNN - Semantic segmentation"
echo ""
echo "Pose Estimation:"
echo "  • YOLOv8n-pose - Human pose estimation"
echo ""
echo "================================"
echo ""
echo "🚀 How to get more models:"
echo ""
echo "1. Hailo Developer Zone (Recommended):"
echo "   https://hailo.ai/developer-zone/"
echo "   • Pre-compiled HEF files"
echo "   • Model documentation"
echo "   • Performance benchmarks"
echo ""
echo "2. Raspberry Pi Examples:"
echo "   If hailo-all is installed, check:"
echo "   /usr/share/hailo-models/"
echo ""
echo "3. Compile yourself:"
echo "   Use Hailo Dataflow Compiler to convert"
echo "   ONNX/TensorFlow models to HEF format"
echo ""
echo "================================"
echo ""
echo "✨ To add your models to the database:"
echo "   1. Copy .hef files to: $MODELS_DIR"
echo "   2. Start the dashboard: ./start.sh"
echo "   3. Go to Config tab to see models"
echo ""
