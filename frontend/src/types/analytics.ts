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
  pause_duration_total: number;
  face_presence_ratio: number;
  eye_contact_ratio: number;
  hands_visibility_ratio: number;
  hands_activity_score: number;
  brightness: number;
  blur: number;
}

export interface ReportRecommendation {
  category: string;
  severity: string;
  message: string;
  tip: string;
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
  recommendations: ReportRecommendation[];
  training_plan: ReportTrainingPlan;
  training_plan_markdown: string;
  transcript: ReportTranscriptSegment[];
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
  recommendations: ReportRecommendation[];
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
