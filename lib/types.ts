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
  frame_a_time: number;
  frame_b_time: number;
  frame_a_url: string;
  frame_b_url: string;
  generated_video_path?: string;
  ad_duration?: number; // ⬅️ ADD THIS
  status: "pending" | "analyzing" | "generating" | "generated";
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

export interface Project {
  id: string;
  name: string;
  video_url: string;
  mux_asset_id?: string;
  playback_id?: string;
  final_playback_id?: string;

  // NEW: Caption tracking
  caption_track_id?: string; // ⬅️ ADD THIS
  caption_status?: "pending" | "ready" | "error"; // ⬅️ ADD THIS

  // NEW: AI features (we'll use these later)
  ai_chapters?: Array<{
    // ⬅️ ADD THIS
    startTime: number;
    title: string;
  }>;
  summary?: string; // ⬅️ ADD THIS
  tags?: string[]; // ⬅️ ADD THIS
  ad_markers?: Array<{
    // ⬅️ ADD THIS
    time: number;
    duration: number;
    label: string;
  }>;
}
