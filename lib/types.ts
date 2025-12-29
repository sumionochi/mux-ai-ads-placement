// Core types for the application

export interface MuxAsset {
  id: string;
  playback_id: string;
  status: string;
  duration?: number;
}

export interface Chapter {
  start_time: number;
  end_time: number;
  title?: string;
}

export interface TransitionAnalysis {
  frame_a_analysis: string;
  frame_b_analysis: string;
  visual_continuity: string;
  product_opportunity: string;
  brand_category:
    | "tech"
    | "fashion"
    | "food"
    | "beverage"
    | "lifestyle"
    | "automotive"
    | "beauty"
    | "sports"
    | "entertainment"
    | "other";
}

export interface TransitionOpportunity {
  id: string;
  project_id: string; // ✅ Changed from video_id
  frame_a_time: number;
  frame_b_time: number;
  frame_a_url: string;
  frame_b_url: string;
  analysis?: TransitionAnalysis;
  status: "pending" | "analyzed" | "generated" | "failed";
  generated_video_path?: string;
}

export interface Marker {
  timestamp: number;
  duration: number;
  type: "sponsored_transition";
  brand: string;
  product: string;
}

export interface VideoProject {
  id: string;
  mux_asset_id: string;
  playback_id: string;
  title: string;
  status: "uploading" | "processing" | "ready" | "error";
  chapters?: Chapter[];
  transitions?: TransitionOpportunity[];
  final_playback_id?: string;
  markers?: Marker[];
  created_at: number;
}
