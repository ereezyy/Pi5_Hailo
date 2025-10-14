# 🚀 ONE-CLICK START

## Quick Start (4 Steps)

### 1. Open Terminal on your Raspberry Pi

### 2. Navigate to project folder:
```bash
cd ~/Pi5_Hailo
```

### 3. Download Hailo models (first time only):
```bash
./download_models.sh
```
This finds available models on your system and downloads the model zoo.

### 4. Run the start script:
```bash
./start.sh
```

**That's it!**

The dashboard will automatically open at:
- **http://localhost:5173** (on the Pi)
- **http://192.168.1.78:5173** (from another device)

---

## 🛑 To Stop Everything

```bash
./stop.sh
```

---

## 📊 What Gets Started

1. **Python Hailo Service** (port 5000) - Connects to your Hailo-8L hardware
2. **Web Dashboard** (port 5173) - Beautiful UI to control everything

Both run in the background so you can close the terminal!

---

## 🐛 Troubleshooting

### If you see "command not found"
```bash
chmod +x start.sh stop.sh
./start.sh
```

### If ports are busy
```bash
./stop.sh
./start.sh
```

### View logs
```bash
tail -f hailo_service.log
tail -f web_dashboard.log
```

---

## 🎯 Using the Dashboard

1. **Overview Tab** - See your Hailo stats, create inference tasks
2. **Video Tab** - Real-time object detection with your camera
3. **Batch Tab** - Process multiple images at once
4. **Analytics Tab** - View performance metrics and heatmaps
5. **Config Tab** - Manage AI models
6. **Diagnostics Tab** - System health monitoring

---

## 💡 Next Steps

- Connect a USB camera for real-time detection
- Upload test images in the Batch tab
- Monitor your Hailo temperature and FPS in real-time
- Export analytics reports

---

## 🎯 Available AI Models

Your dashboard comes pre-configured with popular models:

**Object Detection:**
- YOLOv5s/m - Fast general object detection
- YOLOv8s/m - Latest YOLO variants
- YOLOv6n - Optimized for edge devices
- YOLOX-s - Enhanced YOLO architecture

**Classification:**
- ResNet50 - 1000 image classes
- MobileNetV2 - Lightweight classification
- EfficientNet-B0 - Efficient classification

**Segmentation:**
- YOLOv5n-seg - Instance segmentation
- Fast-SCNN - Semantic segmentation

**Pose Estimation:**
- YOLOv8n-pose - Human pose detection

To use these models, download the HEF files from:
- **Hailo Developer Zone**: https://hailo.ai/developer-zone/
- Or run: `./download_models.sh` to check system locations

**Enjoy your AI-powered Raspberry Pi!** 🎉
