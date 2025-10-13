# Simple Setup Guide

## What You Need
- Raspberry Pi 5 with Hailo-8L AI Kit
- Internet connection

## Setup Steps

### 1. Update Your Pi
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Everything
```bash
# Install Hailo software
sudo apt install hailo-all -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Reboot
sudo reboot
```

### 3. Copy Project to Pi
Transfer this folder to your Pi (USB drive, scp, or git clone)

### 4. Install Project
```bash
cd ~/hailo-dashboard
npm install
pip3 install -r requirements.txt
chmod +x setup.sh
./setup.sh
```

### 5. Add Models
```bash
mkdir -p ~/hailo-models
# Copy your .hef model files here
```

Get models from: https://github.com/hailo-ai/hailo_model_zoo

### 6. Run It

**Terminal 1:**
```bash
python3 hailo_service.py
```

**Terminal 2:**
```bash
npm run dev
```

### 7. Open Dashboard
- On Pi: http://localhost:5173
- From other device: http://YOUR_PI_IP:5173

## Done!

Your dashboard is running. Go to Overview tab and try running inference on an image.

## Problems?

**Hailo not found?**
```bash
lspci | grep -i hailo
sudo apt install --reinstall hailo-all
sudo reboot
```

**Models not showing?**
```bash
ls ~/hailo-models/
# Make sure .hef files are there
```

**Can't access from another device?**
```bash
# Find your Pi's IP
hostname -I

# Allow firewall access
sudo ufw allow 5173
sudo ufw allow 5000
```
