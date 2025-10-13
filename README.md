# Hailo AI Accelerator Dashboard

A production-ready web dashboard for managing and monitoring AI inference tasks on Raspberry Pi 5 with the Hailo-8L AI accelerator.

## Features

- **Real-time Monitoring** - Live accelerator metrics (temperature, power, utilization, FPS)
- **Task Management** - Create and run AI inference tasks with multiple models
- **Camera Integration** - Live camera feed, image capture, and file upload
- **Results Viewer** - Detailed inference results with confidence scores and bounding boxes
- **Performance Charts** - Historical performance visualization with trend analysis
- **Model Management** - Automatic discovery and loading of HEF model files
- **Real-time Updates** - Live data synchronization using Supabase

## Architecture

### Frontend (Web Dashboard)
- React + TypeScript + Vite
- Tailwind CSS for styling
- Supabase for real-time database
- Lucide React for icons

### Backend Services
- **Python Hailo Service** - Direct interface to Hailo-8L hardware via HailoRT API
- **Supabase Edge Function** - Proxy layer between frontend and Python service
- **PostgreSQL Database** - Stores models, tasks, results, and performance stats

## Prerequisites

### Hardware
- Raspberry Pi 5
- Hailo-8L AI Kit (M.2 HAT+ with Hailo-8L module)

### Software
- Raspberry Pi OS (up-to-date)
- Node.js 18+ and npm
- Python 3.11+
- HailoRT installed (`hailo-all` package)

## Installation

### 1. Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Hailo software stack
sudo apt install hailo-all -y

# Install Python dependencies
sudo apt install python3-pip python3-dev -y

# Reboot to ensure Hailo module is detected
sudo reboot
```

### 2. Clone and Setup Project

```bash
# Navigate to project directory
cd hailo-ai-dashboard

# Install Node.js dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Run setup script
chmod +x setup.sh
./setup.sh
```

### 3. Configure Model Directory

Create a directory for your Hailo HEF model files:

```bash
mkdir -p ~/hailo-models
```

Place your `.hef` model files in this directory or in `/usr/share/hailo-models`.

### 4. Verify Hailo Hardware

```bash
# Check if Hailo device is detected
lspci | grep -i hailo

# Test HailoRT installation
python3 -c "from hailo_platform import VDevice; print('HailoRT OK')"
```

## Running the Application

### Start Python Hailo Service

In one terminal:

```bash
python3 hailo_service.py
```

The service will start on `http://localhost:5000`.

### Start Web Dashboard

In another terminal:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## Configuration

### Environment Variables

The `.env` file contains Supabase configuration (pre-configured):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Python Service Configuration

The Python service automatically scans these directories for HEF files:
- `/usr/share/hailo-models`
- `/home/pi/hailo-models`
- `~/hailo-models`
- `/opt/hailo/models`

You can add custom paths by editing `hailo_service.py`.

### Edge Function Configuration

To connect the edge function to your local Python service, set the `HAILO_SERVICE_URL` environment variable. By default, it uses `http://localhost:5000`.

## Usage

### 1. Select a Model
Choose an AI model from the Model Selector panel. The dashboard automatically discovers models from your HEF files.

### 2. Capture Input
Use the Camera Feed to:
- Start live camera streaming
- Capture frames for inference
- Upload images from files

### 3. Create Inference Task
Click "New Task" to create an inference job:
- Name your task
- Select input source (camera, file, URL)
- Choose the model to use

### 4. Run Inference
Click the play button on a pending task to execute inference on the Hailo accelerator.

### 5. View Results
Results appear in the Results Viewer with:
- Detection classes and confidence scores
- Bounding box coordinates
- Processing time and FPS
- Export to JSON option

### 6. Monitor Performance
Track accelerator metrics in real-time:
- Temperature and power consumption
- Utilization percentage
- Average FPS
- Historical performance trends

## API Endpoints

### Python Service

- `GET /api/models` - List available HEF models
- `GET /api/status` - Get device status and stats
- `POST /api/inference` - Run inference on image
- `GET /health` - Health check

### Edge Function

- `GET /hailo-inference/models` - Proxy to Python service
- `GET /hailo-inference/status` - Get accelerator status
- `POST /hailo-inference/run-inference` - Execute inference task

## Database Schema

### Tables

- **ai_models** - Available AI models and their configurations
- **inference_tasks** - Inference tasks with status tracking
- **inference_results** - Results from completed inference tasks
- **accelerator_stats** - Performance metrics over time

All tables have Row Level Security (RLS) enabled with appropriate policies.

## Troubleshooting

### Hailo Device Not Detected

```bash
# Check if module is loaded
lspci | grep -i hailo

# Check system logs
dmesg | grep -i hailo

# Reinstall Hailo software
sudo apt install --reinstall hailo-all
```

### HailoRT Import Error

```bash
# Install HailoRT Python bindings
pip3 install hailort

# Or install from official package
# Download from https://hailo.ai/developer-zone/
```

### Python Service Connection Failed

The dashboard falls back to simulation mode if the Python service is unavailable. Check:
- Is `hailo_service.py` running?
- Is port 5000 accessible?
- Check Python service logs for errors

### Model Loading Issues

Ensure HEF files are:
- Valid Hailo Executable Format
- Compatible with Hailo-8L
- Located in configured model directories
- Have read permissions

## Development

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm run lint
npm run typecheck
```

### Deploy Edge Function

The Supabase edge function is automatically deployed. To redeploy:

```bash
# Edge functions are managed through the Supabase CLI
```

## Performance Tips

- Use quantized models for better performance
- Optimize input image resolution based on model requirements
- Monitor temperature and throttle if necessary
- Use hardware acceleration for image preprocessing when available

## Resources

- [Hailo Developer Zone](https://hailo.ai/developer-zone/)
- [Hailo RPi5 Examples](https://github.com/hailo-ai/hailo-rpi5-examples)
- [Raspberry Pi AI Kit Documentation](https://www.raspberrypi.com/documentation/accessories/ai-kit.html)
- [HailoRT Python API Docs](https://hailo.ai/developer-zone/documentation/)

## License

MIT

## Support

For issues and questions:
- Check the troubleshooting section
- Review Hailo community forums
- Open an issue on GitHub
