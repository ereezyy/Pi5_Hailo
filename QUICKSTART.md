# Quick Start Guide - Raspberry Pi 5 Setup

This is a step-by-step guide to get your Hailo AI Dashboard running on your Raspberry Pi 5.

## Prerequisites Check

Before starting, make sure you have:
- ✅ Raspberry Pi 5
- ✅ Hailo-8L AI Kit installed (M.2 HAT+ with Hailo module)
- ✅ Raspberry Pi OS installed and up to date
- ✅ Internet connection

## Step 1: Install Node.js

```bash
# Check if Node.js is installed
node --version

# If not installed or version < 18, install it:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Install Hailo Software

```bash
# Update your system first
sudo apt update && sudo apt upgrade -y

# Install Hailo AI software stack
sudo apt install hailo-all -y

# Reboot to ensure Hailo module is loaded
sudo reboot
```

After reboot, verify Hailo is detected:

```bash
# Should show your Hailo device
lspci | grep -i hailo

# Should print "HailoRT OK"
python3 -c "from hailo_platform import VDevice; print('HailoRT OK')"
```

## Step 3: Transfer Project to Pi

Copy this entire project directory to your Raspberry Pi 5. You can use:
- USB drive
- `scp` command: `scp -r project-folder/ pi@raspberrypi.local:~/hailo-dashboard`
- Git clone if you have it in a repository

## Step 4: Install Project Dependencies

```bash
# Navigate to project directory
cd ~/hailo-dashboard

# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

## Step 5: Add Your Models

```bash
# Create model directory
mkdir -p ~/hailo-models

# Copy your .hef model files to this directory
# Example:
cp /path/to/your/yolov5s.hef ~/hailo-models/
```

**Where to get models:**
- Pre-compiled models from Hailo Model Zoo: https://github.com/hailo-ai/hailo_model_zoo
- Your own compiled HEF files
- Default Hailo examples in `/usr/share/hailo-models/` (if installed)

## Step 6: Start the Services

You need **TWO** terminal windows/SSH sessions:

### Terminal 1 - Python Hailo Service

```bash
cd ~/hailo-dashboard
python3 hailo_service.py
```

You should see:
```
Starting Hailo AI Service...
Hailo Runtime Available: True
 * Running on http://0.0.0.0:5000
```

**Keep this running!** Don't close this terminal.

### Terminal 2 - Web Dashboard

```bash
cd ~/hailo-dashboard
npm run dev
```

You should see:
```
VITE v5.4.8  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.X.X:5173/
```

**Keep this running too!**

## Step 7: Access the Dashboard

### On the Pi itself:
Open a web browser and go to: `http://localhost:5173`

### From another computer on your network:
1. Find your Pi's IP address: `hostname -I`
2. Open browser and go to: `http://YOUR_PI_IP:5173`
   - Example: `http://192.168.1.100:5173`

## Using the Dashboard

### First Time Setup:

1. **Check Models Tab** (Config tab)
   - Your models should appear automatically
   - If not, they'll be scanned from:
     - `~/hailo-models/`
     - `/usr/share/hailo-models/`
     - `/home/pi/hailo-models/`

2. **Verify System Status** (Overview tab)
   - Check if Hailo is connected
   - Monitor temperature and power

3. **Run Your First Inference**:
   - Go to Overview tab
   - Select a model
   - Use Camera Feed to capture an image or upload a file
   - Click "New Task" to create an inference job
   - Click the play button to run it

### Dashboard Tabs:

- **Overview** - Main dashboard with tasks, queue, and monitoring
- **Batch** - Process multiple images at once
- **Video** - Real-time video inference with live detection overlay
- **Analytics** - Performance analysis and detection heatmaps
- **Config** - Model configuration and parameter tuning
- **Diagnostics** - System health and performance metrics

## Troubleshooting

### Hailo not detected?
```bash
# Check if module is loaded
lspci | grep -i hailo

# Reinstall if needed
sudo apt install --reinstall hailo-all
sudo reboot
```

### Python service won't start?
```bash
# Check Python version (needs 3.11+)
python3 --version

# Install dependencies again
pip3 install -r requirements.txt

# Try running with verbose output
python3 hailo_service.py
```

### Models not showing?
```bash
# Check if models exist
ls -la ~/hailo-models/
ls -la /usr/share/hailo-models/

# Verify .hef file permissions
chmod 644 ~/hailo-models/*.hef
```

### Dashboard won't load?
```bash
# Check if Node.js is running
npm run dev

# Try rebuilding
npm run build
npm run dev
```

### Can't access from another computer?
```bash
# Check Pi's firewall
sudo ufw status

# If firewall is active, allow the ports
sudo ufw allow 5173
sudo ufw allow 5000
```

## Performance Tips

1. **Use lower resolution for real-time video** - Start with 2 FPS target
2. **Monitor temperature** - Hailo can get warm under heavy load
3. **Close unused applications** - Give more resources to inference
4. **Use quantized models** - Better performance on Hailo-8L

## Getting Hailo Models

### Option 1: Hailo Model Zoo
```bash
# Clone Hailo model zoo
git clone https://github.com/hailo-ai/hailo_model_zoo.git
cd hailo_model_zoo

# Pre-compiled models are in:
# hailo_model_zoo/hailo_models/
```

### Option 2: Download from Hailo Developer Zone
1. Visit: https://hailo.ai/developer-zone/
2. Download pre-compiled HEF files
3. Copy to `~/hailo-models/`

### Option 3: Use Example Models
```bash
# If hailo-all installed examples
ls /usr/share/hailo-models/
```

## Running as a Service (Optional)

To make services start automatically on boot:

### Python Service
```bash
sudo nano /etc/systemd/system/hailo-service.service
```

Add:
```ini
[Unit]
Description=Hailo AI Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/hailo-dashboard
ExecStart=/usr/bin/python3 /home/pi/hailo-dashboard/hailo_service.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable hailo-service
sudo systemctl start hailo-service
sudo systemctl status hailo-service
```

## Next Steps

- Explore batch inference for processing multiple images
- Try real-time video detection with your camera
- Configure model parameters for better accuracy
- Export analytics reports
- Set up custom models

## Support

For issues:
1. Check system diagnostics tab in dashboard
2. Review logs in both terminal windows
3. Verify Hailo hardware connection
4. Ensure all dependencies are installed

Enjoy your Hailo AI Dashboard!
