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

export interface ReportSession {
  id: string;
  title: string;
  created_at: string;
  video_url?: string | null;
  duration_seconds: number;
  language: string;
  fps: number;
  resolution: [number, number];
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
  secondary_title?: string;
}

export interface ReportTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface ReportResult {
  session: ReportSession;
  summary: ReportSummary;
  scores: ReportScores;
  metrics: ReportMetrics;
  strengths: string[];
  weaknesses: string[];
  training_plan: ReportTrainingPlan;
  exercise_recommendation?: ReportExerciseRecommendation;
  training_plan_markdown: string;
  transcript: ReportTranscriptSegment[];
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
