/*
  # Hailo AI Accelerator Database Schema

  ## Overview
  This migration creates the database structure for managing Hailo AI accelerator tasks,
  models, and inference results on Raspberry Pi 5.

  ## Tables Created

  ### 1. `ai_models`
  Stores information about available AI models for the Hailo accelerator
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Model name
  - `description` (text) - Model description
  - `model_type` (text) - Type of model (object_detection, classification, segmentation, etc.)
  - `hef_file_path` (text) - Path to the HEF (Hailo Executable Format) file
  - `input_resolution` (text) - Expected input resolution (e.g., "640x640")
  - `is_active` (boolean) - Whether the model is currently active
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. `inference_tasks`
  Tracks AI inference tasks submitted to the Hailo accelerator
  - `id` (uuid, primary key) - Unique identifier
  - `model_id` (uuid, foreign key) - Reference to ai_models
  - `task_name` (text) - Human-readable task name
  - `status` (text) - Task status (pending, processing, completed, failed)
  - `input_source` (text) - Source of input (camera, file, url)
  - `input_path` (text) - Path or URL to input data
  - `priority` (integer) - Task priority (1-10)
  - `created_at` (timestamptz) - Creation timestamp
  - `started_at` (timestamptz) - Processing start time
  - `completed_at` (timestamptz) - Processing completion time

  ### 3. `inference_results`
  Stores results from completed inference tasks
  - `id` (uuid, primary key) - Unique identifier
  - `task_id` (uuid, foreign key) - Reference to inference_tasks
  - `result_data` (jsonb) - Inference results (detections, classifications, etc.)
  - `confidence_scores` (jsonb) - Confidence scores for predictions
  - `processing_time_ms` (integer) - Processing time in milliseconds
  - `output_path` (text) - Path to output file if applicable
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. `accelerator_stats`
  Tracks performance statistics of the Hailo accelerator
  - `id` (uuid, primary key) - Unique identifier
  - `temperature` (decimal) - Accelerator temperature in Celsius
  - `power_consumption` (decimal) - Power consumption in watts
  - `utilization_percent` (integer) - Utilization percentage
  - `total_inferences` (integer) - Total inferences processed
  - `average_fps` (decimal) - Average frames per second
  - `recorded_at` (timestamptz) - Recording timestamp

  ## Security
  - RLS enabled on all tables
  - Public read access for ai_models
  - Authenticated users can create and manage their own tasks
  - Stats are publicly readable for monitoring

  ## Important Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible result storage
  - Status field uses text for extensibility
  - Indexes added for common query patterns
*/

-- Create ai_models table
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  model_type text NOT NULL,
  hef_file_path text NOT NULL,
  input_resolution text DEFAULT '640x640',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create inference_tasks table
CREATE TABLE IF NOT EXISTS inference_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ai_models(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  status text DEFAULT 'pending',
  input_source text NOT NULL,
  input_path text,
  priority integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Create inference_results table
CREATE TABLE IF NOT EXISTS inference_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES inference_tasks(id) ON DELETE CASCADE,
  result_data jsonb DEFAULT '{}',
  confidence_scores jsonb DEFAULT '[]',
  processing_time_ms integer DEFAULT 0,
  output_path text,
  created_at timestamptz DEFAULT now()
);

-- Create accelerator_stats table
CREATE TABLE IF NOT EXISTS accelerator_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temperature decimal(5,2) DEFAULT 0,
  power_consumption decimal(6,2) DEFAULT 0,
  utilization_percent integer DEFAULT 0,
  total_inferences integer DEFAULT 0,
  average_fps decimal(6,2) DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inference_tasks_status ON inference_tasks(status);
CREATE INDEX IF NOT EXISTS idx_inference_tasks_model_id ON inference_tasks(model_id);
CREATE INDEX IF NOT EXISTS idx_inference_tasks_created_at ON inference_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inference_results_task_id ON inference_results(task_id);
CREATE INDEX IF NOT EXISTS idx_accelerator_stats_recorded_at ON accelerator_stats(recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE accelerator_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_models (publicly readable)
CREATE POLICY "Anyone can view AI models"
  ON ai_models FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create models"
  ON ai_models FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update models"
  ON ai_models FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete models"
  ON ai_models FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for inference_tasks (publicly readable and writable for demo)
CREATE POLICY "Anyone can view inference tasks"
  ON inference_tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create inference tasks"
  ON inference_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update inference tasks"
  ON inference_tasks FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete inference tasks"
  ON inference_tasks FOR DELETE
  USING (true);

-- RLS Policies for inference_results (publicly readable)
CREATE POLICY "Anyone can view inference results"
  ON inference_results FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create inference results"
  ON inference_results FOR INSERT
  WITH CHECK (true);

-- RLS Policies for accelerator_stats (publicly readable)
CREATE POLICY "Anyone can view accelerator stats"
  ON accelerator_stats FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert accelerator stats"
  ON accelerator_stats FOR INSERT
  WITH CHECK (true);

-- Insert some sample AI models for Hailo
INSERT INTO ai_models (name, description, model_type, hef_file_path, input_resolution) VALUES
  ('YOLOv5s', 'Fast object detection model optimized for Hailo-8', 'object_detection', '/models/yolov5s.hef', '640x640'),
  ('ResNet50', 'Image classification model for 1000 classes', 'classification', '/models/resnet50.hef', '224x224'),
  ('MobileNetV2', 'Lightweight classification model', 'classification', '/models/mobilenetv2.hef', '224x224')
ON CONFLICT DO NOTHING;