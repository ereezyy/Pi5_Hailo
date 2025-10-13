export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ai_models: {
        Row: {
          id: string
          name: string
          description: string
          model_type: string
          hef_file_path: string
          input_resolution: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          model_type: string
          hef_file_path: string
          input_resolution?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          model_type?: string
          hef_file_path?: string
          input_resolution?: string
          is_active?: boolean
          created_at?: string
        }
      }
      inference_tasks: {
        Row: {
          id: string
          model_id: string
          task_name: string
          status: string
          input_source: string
          input_path: string | null
          priority: number
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          model_id: string
          task_name: string
          status?: string
          input_source: string
          input_path?: string | null
          priority?: number
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          model_id?: string
          task_name?: string
          status?: string
          input_source?: string
          input_path?: string | null
          priority?: number
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      inference_results: {
        Row: {
          id: string
          task_id: string
          result_data: Json
          confidence_scores: Json
          processing_time_ms: number
          output_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          result_data?: Json
          confidence_scores?: Json
          processing_time_ms?: number
          output_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          result_data?: Json
          confidence_scores?: Json
          processing_time_ms?: number
          output_path?: string | null
          created_at?: string
        }
      }
      accelerator_stats: {
        Row: {
          id: string
          temperature: number
          power_consumption: number
          utilization_percent: number
          total_inferences: number
          average_fps: number
          recorded_at: string
        }
        Insert: {
          id?: string
          temperature?: number
          power_consumption?: number
          utilization_percent?: number
          total_inferences?: number
          average_fps?: number
          recorded_at?: string
        }
        Update: {
          id?: string
          temperature?: number
          power_consumption?: number
          utilization_percent?: number
          total_inferences?: number
          average_fps?: number
          recorded_at?: string
        }
      }
    }
  }
}
