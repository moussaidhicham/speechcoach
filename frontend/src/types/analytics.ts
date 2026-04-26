export type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface StatusResponse {
  session_id: string;
  status: SessionStatus;
  current_step?: string | null;
  progress_percent?: number | null;
  duration_seconds?: number | null;
  processing_started_at?: string | null;
}

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

export interface ReportSession {
  id: string;
  title: string;
  created_at: string;
  video_url?: string | null;
  duration_seconds: number;
  language: string;
  fps: number;
  resolution: [number, number];
  device_type?: 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone';
  device_source?: string;
  device_confidence?: number;
  processing_time?: number;
}

export interface ReportSummary {
  overall_score: number;
  headline: string;
  narrative: string;
  priority_focus: string;
  encouragement?: string | null;
}

export interface ReportScores {
  overall: number;
  voice: number;
  body_language: number;
  scene: number;
  presence: number;
  eye_contact: number;
}

export interface ReportMetrics {
  wpm: number;
  pause_count: number;
  filler_count: number;
  stutter_count?: number;
  pause_duration_total: number;
  face_presence_ratio: number;
  eye_contact_ratio: number;
  hands_visibility_ratio: number;
  hands_activity_score: number;
  brightness: number;
  blur: number;
}

export interface ReportTrainingDay {
  title: string;
  items: string[];
}

export interface ReportTrainingPlan {
  focus_primary: string;
  focus_secondary: string;
  days: ReportTrainingDay[];
}

export type PracticeMode = 'none' | 'light_tip' | 'setup_action' | 'single_exercise' | 'mini_plan_3_days';

export interface ReportExerciseRecommendation {
  mode: PracticeMode;
  should_display: boolean;
  title: string;
  summary: string;
  steps: string[];
  goal: string;
  self_check: string;
  focus_primary: string;
  focus_secondary: string;
}

export interface ReportTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface ReportEqMetrics {
  version: string;
  device_profile: string;
  device_source: string;
  device_confidence: number;
  reliability: {
    overall: number;
    face_track: number;
    image_clarity: number;
    audio_duration: number;
    device_certainty: number;
  };
  scores: {
    stress: number;
    confidence: number;
    articulation: number;
  };
  objectives?: {
    stress?: { direction: string; aspects: string[] };
    confidence?: { direction: string; aspects: string[] };
    articulation?: { direction: string; aspects: string[] };
  };
  interpretation?: {
    label: 'strong' | 'cautious' | 'weak' | string;
    should_interpret: boolean;
    threshold: number;
  };
  explanations?: {
    stress_drivers?: string[];
    confidence_limiters?: string[];
    confidence_boosters?: string[];
    articulation_limiters?: string[];
  };
  flags: string[];
  emotion_scores?: {
    rule_based?: {
      eq_scores?: {
        stress: number;
        confidence: number;
        articulation: number;
      };
    };
    model_based?: {
      eq_scores?: {
        stress: number;
        confidence: number;
        articulation: number;
      };
      vision_available?: boolean;
      fused_emotions?: Record<string, number>;
    };
  };
}

export interface ReportResult {
  session: ReportSession;
  summary: ReportSummary;
  fallbacks?: {
    bilan?: { origin: 'llm' | 'fallback'; reason?: string };
    priorite?: { origin: 'llm' | 'fallback'; reason?: string };
    encouragement?: { origin: 'llm' | 'fallback'; reason?: string };
    exercice?: { origin: 'llm' | 'fallback'; reason?: string };
  };
  scores: ReportScores;
  metrics: ReportMetrics;
  strengths: string[];
  weaknesses: string[];
  training_plan: ReportTrainingPlan;
  exercise_recommendation?: ReportExerciseRecommendation;
  training_plan_markdown: string;
  transcript: ReportTranscriptSegment[];
  eq_metrics?: ReportEqMetrics;
  visuals?: {
    audio_energy: string;
    vision_timeline: string;
  };
  enrichment_status?: 'pending' | 'completed' | 'failed';
}

export interface DashboardProgressPoint {
  created_at: string;
  score: number;
  wpm: number;
}

export interface DashboardCoachingSnapshot {
  session_id: string;
  title: string;
  created_at: string;
  overall_score: number;
  headline: string;
  priority_focus: string;
  narrative: string;
  encouragement?: string | null;
  primary_focus: string;
  first_strength?: string | null;
  next_practice_title?: string | null;
  next_practice_step?: string | null;
}

export interface DashboardSummary {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  best_score: number;
  total_practice_minutes: number;
  recent_sessions: SessionHistory[];
  progress_chart: DashboardProgressPoint[];
  latest_coaching: DashboardCoachingSnapshot | null;
}

export interface VideoMetadata {
  duration: number;
  fps: number;
  resolution: [number, number];
}
