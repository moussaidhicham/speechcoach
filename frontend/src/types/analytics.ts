export type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SessionHistory {
  session_id: string;
  title: string;
  created_at: string;
  status: SessionStatus;
  duration: number;
  overall_score?: number;
  wpm?: number;
  voice_score?: number;
  body_language_score?: number;
  video_url?: string;
}

export interface AnalysisResult {
  id: string;
  session_id: string;
  // Metrics
  wpm: number;
  filler_words_count: number;
  articulation_score: number;
  eye_contact_ratio: number;
  hand_gestures_count: number;
  posture_score: number;
  
  // Scores
  overall_score: number;
  voice_score: number;
  scene_score: number;
  body_language_score: number;
  
  // AI Feedback
  coaching_advice: string;
  recommendations: string[]; // JSON string in backend, parsed in frontend
  
  created_at: string;
  video_url?: string;
}

export interface VideoMetadata {
  duration: number;
  fps: number;
  resolution: [number, number];
}
