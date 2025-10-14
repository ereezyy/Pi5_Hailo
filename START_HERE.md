# 🚀 ONE-CLICK START

## Quick Start (3 Steps)

### 1. Open Terminal on your Raspberry Pi

### 2. Navigate to project folder:
```bash
cd ~/Pi5_Hailo
```

### 3. Run the start script:
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

**Enjoy your AI-powered Raspberry Pi!** 🎉
