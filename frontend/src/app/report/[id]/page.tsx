'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Mic,
  PauseCircle,
  Sparkles,
  Target,
  User,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';
import api from '@/lib/api';
import {
  formatDuration,
  formatLanguage,
  formatReportDate,
  getScoreVerdict,
} from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { videoService } from '@/services/video.service';
import { ReportResult } from '@/types/analytics';
import { useAuth } from '@/context/auth-context';

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

interface ScoreCardProps {
  label:  string;
  value:  number;
  icon:   LucideIcon;
  helper: string;
}

interface MetricProgressCardProps {
  label:       string;
  value:       number;
  description: string;
  icon:        LucideIcon;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatResolutionValue(resolution: [number, number]) {
  if (!resolution || resolution[0] <= 0 || resolution[1] <= 0) {
    return 'Non renseignee';
  }
  return `${resolution[0]}x${resolution[1]}`;
}

function formatFpsValue(fps: number) {
  if (!Number.isFinite(fps) || fps <= 1 || fps > 240) {
    return 'Non renseigne';
  }
  return `${Number(fps.toFixed(2)).toString()}`;
}

function formatLightingLabel(brightness: number) {
  if (brightness < 70) return 'Sous-exposé';
  if (brightness > 210) return 'Surexposé';
  return 'Optimal';
}

function formatSharpnessLabel(blur: number) {
  if (blur < 20) return 'Flou critique';
  if (blur < 40) return 'Légèrement flou';
  return 'Optimal';
}

function formatAxisScore(value: number) {
  return `${(value / 10).toFixed(1)}/10`;
}

function formatPaceLabel(wpm: number) {
  if (wpm > 160) return 'Rapide';
  if (wpm >= 120) return 'Optimal';
  return 'Lent';
}

function formatEyeContactLabel(value: number) {
  if (value >= 70) return 'Bon';
  if (value >= 40) return 'Moyen';
  return 'Faible';
}

function formatHandsLabel(value: number) {
  if (value >= 60) return 'Visibles';
  if (value >= 30) return 'Parfois visibles';
  return 'Peu visibles';
}

function formatActivityLabel(score: number) {
  if (score > 6.5) return 'Agité';
  if (score >= 2.5) return 'Équilibré';
  return 'Figé';
}

function getMeaningfulTokens(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3);
}

function hasStrongOverlap(source: string, comparison: string) {
  const sourceTokens = new Set(getMeaningfulTokens(source));
  const comparisonTokens = new Set(getMeaningfulTokens(comparison));

  if (sourceTokens.size === 0 || comparisonTokens.size === 0) {
    return false;
  }

  let sharedCount = 0;
  sourceTokens.forEach((token) => {
    if (comparisonTokens.has(token)) {
      sharedCount += 1;
    }
  });

  return sharedCount / sourceTokens.size >= 0.55;
}

function shouldDisplayEncouragement(
  encouragement: string | null | undefined,
  narrative: string,
  priority: string
) {
  if (!encouragement) return false;
  if (encouragement.length > 220) return false;
  if (hasStrongOverlap(encouragement, narrative)) return false;
  if (hasStrongOverlap(encouragement, priority)) return false;
  return true;
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

export default function ReportPage() {
  const params = useParams();
  const { token } = useAuth();
  const sessionIdParam = params?.id;
  const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;

  const [report,              setReport]              = React.useState<ReportResult | null>(null);
  const [isLoading,           setIsLoading]           = React.useState(true);
  const [isExportingPdf,      setIsExportingPdf]      = React.useState(false);
  const [isExportingMarkdown, setIsExportingMarkdown] = React.useState(false);
  const [showFeedback,        setShowFeedback]        = React.useState(false);
  const [enrichmentMonitorStatus, setEnrichmentMonitorStatus] = React.useState<'idle' | 'running' | 'ready' | 'failed'>('idle');

  const fetchReport = React.useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const [reportData, feedbackStatus] = await Promise.all([
        videoService.getResult(sessionId),
        api.get<{ has_feedback: boolean }>('/feedback/platform/check').catch(() => null),
      ]);
      setReport(reportData);
      setShowFeedback(!(feedbackStatus?.data?.has_feedback ?? true));
    } catch (err) {
      console.error('Failed to fetch report:', err);
      toast.error('Impossible de charger ce rapport pour le moment.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    if (token && sessionId) fetchReport().catch(() => undefined);
  }, [fetchReport, sessionId, token]);

  React.useEffect(() => {
    if (!report || report.enrichment_status !== 'pending') {
      if (report?.enrichment_status === 'completed') {
        setEnrichmentMonitorStatus('idle');
      }
      return;
    }

    if (enrichmentMonitorStatus === 'idle') {
      setEnrichmentMonitorStatus('running');
      toast.message("L'enrichissement IA est en cours. Vous pouvez continuer votre lecture, on vous avertira lorsqu'il sera terminÃ©.");
    }

    const timer = window.setInterval(async () => {
      if (!sessionId) return;
      try {
        const latestReport = await videoService.getResult(sessionId);

        if (latestReport.enrichment_status === 'completed') {
          window.clearInterval(timer);
          setEnrichmentMonitorStatus('ready');
          toast.success("L'enrichissement IA est terminÃ©. Veuillez actualiser la page pour afficher la version enrichie.");
          return;
        }

        if (latestReport.enrichment_status === 'failed') {
          window.clearInterval(timer);
          setEnrichmentMonitorStatus('failed');
          toast.error("L'enrichissement IA n'a pas pu aboutir cette fois-ci.");
        }
      } catch {
        // Keep the current report visible; the next interval can retry quietly.
      }
    }, 8000);

    return () => window.clearInterval(timer);
  }, [enrichmentMonitorStatus, report, sessionId]);

  const isEnrichmentRunning = report?.enrichment_status === 'pending' && enrichmentMonitorStatus !== 'ready' && enrichmentMonitorStatus !== 'failed';
  const isEnrichmentReadyForRefresh = enrichmentMonitorStatus === 'ready';
  const hasEnrichmentFailed = report?.enrichment_status === 'failed' || enrichmentMonitorStatus === 'failed';
  const fallbacks = report?.fallbacks;
  const coachingHeadline = isEnrichmentRunning
    ? 'Analyse avancee en preparation.'
    : isEnrichmentReadyForRefresh
      ? 'Analyse avancee prete.'
      : report?.summary.headline || 'Synthese du coach';
  const coachingNarrative = isEnrichmentRunning
    ? "Le rapport principal est disponible. Le coach IA reformule encore les priorites pour vous livrer une synthese plus claire."
    : isEnrichmentReadyForRefresh
      ? "L'enrichissement IA est termine. Actualisez la page pour remplacer la version provisoire par la synthese finale."
      : report?.summary.narrative || '';
  const coachingPriority = isEnrichmentRunning
    ? 'Analyse avancee en cours'
    : isEnrichmentReadyForRefresh
      ? 'Version enrichie prete'
      : report?.summary.priority_focus || 'Progression generale';
  const coachingEncouragement = isEnrichmentRunning || isEnrichmentReadyForRefresh ? null : report?.summary.encouragement;
  const displayEncouragement = coachingEncouragement;
  const exerciseRecommendation = report?.exercise_recommendation;
  const focusPrimaryRaw = report?.training_plan.focus_primary || exerciseRecommendation?.focus_primary || 'Progression generale';
  const focusPrimary = focusPrimaryRaw === 'Cadre' ? 'Presence' : focusPrimaryRaw;
  const focusSecondary = report?.training_plan.focus_secondary || exerciseRecommendation?.focus_secondary || null;
  const practiceDays = report?.training_plan.days ?? [];
  const shouldShowPracticeCard = report
    ? exerciseRecommendation?.should_display ?? practiceDays.length > 0
    : false;
  const practiceCardTitle =
    exerciseRecommendation?.mode === 'setup_action'
      ? 'Prochaine verification'
      : 'Prochain exercice';
  const practiceCardDescription =
    exerciseRecommendation?.mode === 'setup_action'
      ? 'Une verification simple a faire avant la prochaine prise.'
      : 'Une action concrete a tester des la prochaine repetition.';

  const handleExportMarkdown = React.useCallback(async () => {
    if (!sessionId) return;
    setIsExportingMarkdown(true);
    try {
      const blob = await videoService.getMarkdownExport(sessionId);
      downloadBlob(blob, `speechcoach-report-${sessionId}.md`);
      toast.success('Export Markdown pret.');
    } catch {
      toast.error('Export Markdown indisponible pour le moment.');
    } finally {
      setIsExportingMarkdown(false);
    }
  }, [sessionId]);

  const handleExportPdf = React.useCallback(async () => {
    if (!sessionId) return;
    setIsExportingPdf(true);
    try {
      const blob = await videoService.getPdfExport(sessionId);
      downloadBlob(blob, `speechcoach-report-${sessionId}.pdf`);
      toast.success('Export PDF pret.');
    } catch {
      toast.error('Export PDF indisponible pour le moment.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [sessionId]);

  const handleCopyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Lien du rapport copie.');
    } catch {
      toast.error('Impossible de copier le lien automatiquement.');
    }
  }, []);

  const actions = report ? (
    <div className="no-print flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={handleCopyLink}>
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        Copier le lien
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportMarkdown} disabled={isExportingMarkdown}>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        {isExportingMarkdown ? 'Generation...' : 'Markdown'}
      </Button>
      <Button size="sm" onClick={handleExportPdf} disabled={isExportingPdf}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        {isExportingPdf ? 'Preparation...' : 'Export PDF'}
      </Button>
    </div>
  ) : null;

  return (
    <AppShell
      title={report?.session.title || 'Rapport'}
      subtitle={
        report
          ? `Session du ${formatReportDate(report.session.created_at)}`
          : 'Lecture detaillee de votre analyse'
      }
      actions={actions}
      maxWidth="7xl"
    >
      {isLoading  && <ReportLoadingState />}
      {!isLoading && !report && <ReportEmptyState onRetry={fetchReport} />}
      {!isLoading && report && (
        <article className="space-y-7 print-container" aria-label="Rapport d'analyse SpeechCoach">

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Hero: summary + video Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">

            {/* Summary card */}
            <Card className="print-card overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-background/60 px-7 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                      Resume executif
                    </Badge>
                    {isEnrichmentRunning && (
                      <Badge variant="outline" className="mb-4 ml-2">
                        Enrichissement IA en cours
                      </Badge>
                    )}
                    {isEnrichmentReadyForRefresh && (
                      <Badge variant="outline" className="mb-4 ml-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Enrichissement termine
                      </Badge>
                    )}
                    <CardTitle>{coachingHeadline}</CardTitle>
                    <CardDescription className="mt-2.5 max-w-2xl text-sm leading-relaxed">
                      {coachingNarrative}
                      {fallbacks?.bilan?.origin === 'fallback' && fallbacks?.bilan?.reason
                        ? ` (fallback: ${fallbacks.bilan.reason})`
                        : null}
                    </CardDescription>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left">
                    <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                      Priorite
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-foreground">
                      {coachingPriority}
                      {fallbacks?.priorite?.origin === 'fallback' && fallbacks?.priorite?.reason
                        ? ` (fallback: ${fallbacks.priorite.reason})`
                        : null}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-7">
                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                  {/* Left: focus / encouragement */}
                  <div className="space-y-4">
                    {(displayEncouragement || isEnrichmentReadyForRefresh) && (
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                        <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Encouragement du coach
                        </div>
                        {displayEncouragement ? (
                          <p className="mt-2.5 rounded-xl bg-primary/8 px-4 py-3 text-sm leading-relaxed text-foreground">
                            {displayEncouragement}
                            {fallbacks?.encouragement?.origin === 'fallback' && fallbacks?.encouragement?.reason
                              ? ` (fallback: ${fallbacks.encouragement.reason})`
                              : null}
                          </p>
                        ) : null}
                        {isEnrichmentReadyForRefresh && (
                          <div className="mt-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-foreground">
                            La synthese enrichie est prete. Cliquez sur <span className="font-medium">Recharger</span> pour afficher la version finale.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: score block (Ribbon style) */}
                  <div className="data-ribbon relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-violet-600 p-6 text-primary-foreground shadow-xl shadow-primary/20">
                    {/* Decorative glows for premium feel */}
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

                    <div className="relative z-10">
                      <div className="text-[11px] font-medium uppercase tracking-widest text-primary-foreground/70">
                        Score global
                      </div>
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                        <div className="flex shrink-0 items-baseline gap-1.5">
                          <div className="font-display text-7xl font-semibold leading-none tracking-tight text-primary-foreground">
                            {report.summary.overall_score}
                          </div>
                          <div className="text-xl font-medium text-primary-foreground/50">/100</div>
                        </div>
                        <div className="shrink-0 whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground backdrop-blur-md shadow-sm">
                          {getScoreVerdict(report.summary.overall_score)}
                        </div>
                      </div>
                      <div className="mt-8 space-y-5">
                        <div>
                          <div className="mb-2.5 flex items-center justify-between text-xs font-medium text-primary-foreground/70">
                            <span>Évaluation générale</span>
                            <span>{report.summary.overall_score}%</span>
                          </div>
                          <Progress
                            value={report.summary.overall_score}
                            className="h-2 w-full"
                            trackClassName="bg-white/20"
                            indicatorClassName="bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <MiniMetricCard label="Résolution" value={formatResolutionValue(report.session.resolution)} />
                          <MiniMetricCard label="Fluidité (FPS)" value={formatFpsValue(report.session.fps)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session meta cards under coaching and score blocks */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SessionMetaCard label="Date de session" value={formatReportDate(report.session.created_at)} />
                  <SessionMetaCard label="Durée vidéo"     value={formatDuration(report.session.duration_seconds)} />
                  <SessionMetaCard label="Langue"          value={formatLanguage(report.session.language)} />
                  <SessionMetaCard label="Temps d'analyse" value={report.session.processing_time ? formatDuration(report.session.processing_time) : 'N/A'} />
                </div>
              </CardContent>
            </Card>

            {/* Right column: video + score breakdown */}
            <div className="flex flex-col gap-6">
              {report.session.video_url && (
                <Card className="no-print overflow-hidden print-card">
                  <CardHeader>
                  <CardTitle>Video analysee</CardTitle>
                  <CardDescription>Relisez la session en parallele du rapport.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-black">
                      <video
                        src={`${apiBaseUrl}${report.session.video_url}`}
                        controls
                        className="aspect-video w-full object-contain"
                        aria-label="Video analysee"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="print-card flex-1">
                <CardHeader>
                  <CardTitle>Scores &amp; bilan</CardTitle>
                  <CardDescription>Lecture rapide des axes principaux avant d'ouvrir le detail des mesures.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CompactScoreRow label="Voix / Debit" value={formatAxisScore(report.scores.voice)} helper="Rythme, pauses et fluidite" />
                  <CompactScoreRow label="Posture / Gestes" value={formatAxisScore(report.scores.body_language)} helper="Visibilite des mains et aisance corporelle" />
                  <CompactScoreRow label="Regard / Presence" value={formatAxisScore(report.scores.presence)} helper="Contact visuel et stabilite dans le cadre" />
                  <CompactScoreRow label="Qualite / Cadrage" value={formatAxisScore(report.scores.scene)} helper="Lisibilite generale de l'image" />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Strengths + Weaknesses Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <section className="grid gap-6 lg:grid-cols-2">
            <ListSectionCard
              title="Points forts"
              description="Les atouts qui consolident la crédibilité de votre discours."
              icon={CheckCircle2}
              items={report.strengths}
              tone="success"
            />
            <ListSectionCard
              title="Axes de progression"
              description="Les elements a corriger en priorite pour la prochaine repetition."
              icon={ArrowRight}
              items={report.weaknesses}
              tone="warning"
            />
          </section>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Metrics + Recommendations Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">

            {/* Metrics card */}
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Details des mesures</CardTitle>
                <CardDescription>
                  Le rapport montre d'abord l'essentiel. Ouvrez ce bloc seulement si vous voulez voir les details techniques.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <details className="group rounded-2xl border border-border/60 bg-secondary/30 p-5 open:bg-background/70">
                  <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                    Voir les details audio, visuels et environnementaux
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <div className="text-sm font-medium text-foreground">Métriques vocales</div>
                      <div className="mt-3 grid gap-3">
                        <ContextRow label="Débit (WPM)" value={`${report.metrics.wpm} mots/min (${formatPaceLabel(report.metrics.wpm)})`} target="Entre 120 et 160 mots/min (Maîtrisé)" />
                        <ContextRow label="Pauses (>0.5s)" value={`${report.metrics.pause_count} pause(s)`} target="Moins de 4 pauses longues par minute" />
                        <ContextRow label="Hésitations" value={`${report.metrics.filler_count} détectée(s) ${report.metrics.filler_count === 0 ? '(Excellent)' : ''}`} target="Moins de 2 mots parasites par minute" />
                        <ContextRow label="Répétitions" value={`${report.metrics.stutter_count ?? 0} détectée(s) ${(report.metrics.stutter_count ?? 0) === 0 ? '(Excellent)' : ''}`} target="Aucune répétition pour un score optimal" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <div className="text-sm font-medium text-foreground">Qualité visuelle</div>
                      <div className="mt-3 grid gap-3">
                        <ContextRow 
                          label="Luminosité" 
                          value={`${Number(report.metrics.brightness).toFixed(0)} (${formatLightingLabel(report.metrics.brightness)})`} 
                          target="Entre 70 et 210 pour éviter l'éblouissement" 
                        />
                        <ContextRow 
                          label="Netteté" 
                          value={`${Number(report.metrics.blur).toFixed(0)} (${formatSharpnessLabel(report.metrics.blur)})`} 
                          target="Score supérieur à 40 pour une image nette" 
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <div className="text-sm font-medium text-foreground">Métriques visuelles</div>
                      <div className="mt-3 grid gap-3">
                        <ContextRow label="Présence visage" value={`${report.metrics.face_presence_ratio}%`} target="Supérieure à 80% dans le cadre" />
                        <ContextRow label="Contact visuel" value={`${report.metrics.eye_contact_ratio}% (${formatEyeContactLabel(report.metrics.eye_contact_ratio)})`} target="Soutenir la caméra (> 70% du temps)" />
                        <ContextRow label="Mains visibles" value={`${report.metrics.hands_visibility_ratio}% (${formatHandsLabel(report.metrics.hands_visibility_ratio)})`} target="Mains dans le cadre (> 60% du temps)" />
                        <ContextRow label="Intensité gestuelle (mains)" value={`${report.metrics.hands_activity_score}/10 (${formatActivityLabel(report.metrics.hands_activity_score)})`} target="Mouvement équilibré (2.5 à 6.5/10)" />
                      </div>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>

            {shouldShowPracticeCard ? (
              <Card className="print-card">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>{practiceCardTitle}</CardTitle>
                      <CardDescription>
                        {practiceCardDescription}
                        {fallbacks?.exercice?.origin === 'fallback' && fallbacks?.exercice?.reason
                          ? ` (fallback: ${fallbacks.exercice.reason})`
                          : null}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchReport().catch(() => undefined)}>
                      Recharger
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEnrichmentRunning ? (
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm leading-relaxed text-muted-foreground">
                      L&apos;enrichissement IA est encore en cours. Nous preparons une reformulation plus claire et plus utile des conseils.
                      Vous n&apos;avez rien a faire pour le moment.
                    </div>
                  ) : hasEnrichmentFailed ? (
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm leading-relaxed text-muted-foreground">
                      Le coaching enrichi n&apos;a pas pu etre genere cette fois-ci. Vous pouvez conserver les mesures brutes de cette session
                      et relancer une analyse plus tard.
                    </div>
                  ) : isEnrichmentReadyForRefresh ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-relaxed text-foreground">
                      L&apos;enrichissement IA est termine. Veuillez actualiser la page pour afficher la version finale du coaching.
                    </div>
                  ) : (
                    <PracticeFocusCard
                      primaryFocus={focusPrimary}
                      secondaryFocus={focusSecondary}
                      practiceDays={practiceDays}
                      exerciseRecommendation={exerciseRecommendation}
                    />
                  )}
                </CardContent>
              </Card>
            ) : null}
          </section>
{/* Visual Analytics */}
          {report.visuals && (
            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="print-card">
                <CardHeader>
                  <CardTitle className="text-sm">Dynamique Vocale</CardTitle>
                  <CardDescription>Fluctuations de l'énergie sonore durant votre discours.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-white p-2 dark:bg-zinc-950">
                    <img 
                      src={`${apiBaseUrl}${report.visuals.audio_energy}`} 
                      alt="Graphique d'énergie audio" 
                      className="w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="print-card">
                <CardHeader>
                   <CardTitle className="text-sm">Timeline Visuelle</CardTitle>
                   <CardDescription>Présence du visage, du regard et des mains sur la durée.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="overflow-hidden rounded-xl border border-border/60 bg-white p-2 dark:bg-zinc-950">
                    <img 
                      src={`${apiBaseUrl}${report.visuals.vision_timeline}`} 
                      alt="Timeline de présence visuelle" 
                      className="w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Context Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Transcript Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <section>
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Transcription</CardTitle>
                <CardDescription>
                  Conservez la transcription complete pour vos relectures ou vos exports Markdown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <details className="group rounded-2xl border border-border/60 bg-secondary/30 p-5 open:bg-background/70">
                  <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                    Voir la transcription ({report.transcript.length} segments)
                  </summary>
                  <div className="mt-4 space-y-2.5">
                    {report.transcript.length > 0 ? (
                      report.transcript.map((segment) => (
                        <div
                          key={`${segment.start}-${segment.end}-${segment.text.slice(0, 12)}`}
                          className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm leading-relaxed"
                        >
                          <div className="font-mono text-xs text-muted-foreground">
                            {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                          </div>
                          <div className="mt-1.5 text-foreground">{segment.text}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                        Aucune transcription disponible pour cette session.
                      </div>
                    )}
                  </div>
                </details>
              </CardContent>
            </Card>
          </section>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Feedback Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {showFeedback && (
            <section className="no-print">
              <div className="mx-auto max-w-2xl">
                <FeedbackForm onSubmitted={() => setTimeout(() => setShowFeedback(false), 1800)} />
              </div>
            </section>
          )}
        </article>
      )}
    </AppShell>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

function downloadBlob(blob: Blob, filename: string) {
  const url  = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Loading / Empty Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

function ReportLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Skeleton className="h-80 rounded-3xl" />
        <div className="grid gap-6">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    </div>
  );
}

function ReportEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardContent className="flex flex-col items-center gap-5 px-7 py-14">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium">Rapport introuvable</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cette session n'est peut-etre pas terminee, ou elle n'est plus disponible
            dans votre historique.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={onRetry}>Recharger</Button>
          <Link href="/history">
            <Button>
              Retour a l'historique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Small components Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

function SessionMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/70 px-4 py-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</div>
      <div
        className="mt-2 max-w-full break-words text-sm font-medium leading-snug text-foreground/90"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ContextRow({ label, value, target, mono = false }: { label: string; value: string; target?: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/70 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium text-foreground', mono && 'font-mono text-xs')}>
          {value}
        </span>
      </div>
      {target ? (
        <div className="text-[10px] font-medium tracking-tight text-muted-foreground/60">
          Objectif : <span className="text-primary/70">{target}</span>
        </div>
      ) : null}
    </div>
  );
}

function MiniMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-4 py-3.5">
      <div className="max-w-full break-words text-[10px] font-medium uppercase tracking-[0.12em] leading-snug text-primary-foreground/50">
        {label}
      </div>
      <div
        className="mt-1.5 max-w-full break-words text-sm font-medium leading-snug text-primary-foreground"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function CompactScoreRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-background/70 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{helper}</div>
      </div>
      <div className="shrink-0 font-mono text-base font-medium text-foreground">{value}</div>
    </div>
  );
}

function ScoreCard({ label, value, icon: Icon, helper }: ScoreCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{helper}</div>
          </div>
        </div>
        <div className="font-mono text-base font-medium">{value}</div>
      </div>
      <Progress value={value} className="w-full" />
    </div>
  );
}

function MetricProgressCard({ label, value, description, icon: Icon }: MetricProgressCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </div>
        <div className="font-mono text-sm font-medium">{value}%</div>
      </div>
      <Progress value={value} className="w-full" />
    </div>
  );
}

function MetricStatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-mono text-lg font-medium text-foreground">{value}</div>
      {description ? (
        <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</div>
      ) : null}
    </div>
  );
}

function ListSectionCard({
  title, description, icon: Icon, items, tone,
}: {
  title:       string;
  description: string;
  icon:        LucideIcon;
  items:       string[];
  tone:        'success' | 'warning';
}) {
  return (
    <Card className="print-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            tone === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                               : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item} className="rounded-xl border border-border/60 bg-background/70 px-4 py-3.5 text-sm leading-relaxed">
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3.5 text-sm text-muted-foreground">
            Aucune information detaillee n'a ete fournie dans cette section.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PracticeFocusCard({
  primaryFocus,
  secondaryFocus,
  practiceDays,
  exerciseRecommendation,
}: {
  primaryFocus: string;
  secondaryFocus?: string | null;
  practiceDays: ReportResult['training_plan']['days'];
  exerciseRecommendation?: ReportResult['exercise_recommendation'];
}) {
  const practiceMode = exerciseRecommendation?.mode ?? 'mini_plan_3_days';
  const cardTitle = "Plan d'action";
  const shouldShowSecondaryFocus =
    Boolean(secondaryFocus)
    && (practiceMode === 'mini_plan_3_days' || practiceMode === 'setup_action')
    && secondaryFocus !== primaryFocus;

  // Improved steps harvesting avoiding destructive punctuation splitting
  const rawSteps = practiceMode === 'mini_plan_3_days' && practiceDays.length > 0
    ? practiceDays[0].items
    : (exerciseRecommendation?.steps ?? []);

  // Use the array directly, removing the reckless \.\s|, split that broke sentences
  const steps = rawSteps.flatMap(s => s.split(/ \| /))
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const themeTitle = exerciseRecommendation?.title || (practiceDays.length > 0 ? practiceDays[0].title : 'Pratique directe');
  const summary = exerciseRecommendation?.summary;

  return (
    <div className="space-y-4">
      {/* Dense Header: Focus & Title synced */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-tight px-1.5 py-0">
              Focus: {primaryFocus}
            </Badge>
            {shouldShowSecondaryFocus && (
              <Badge variant="secondary" className="bg-secondary/40 text-muted-foreground border-none text-[10px] font-bold uppercase tracking-tight px-1.5 py-0">
                {secondaryFocus}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 border-primary/20 bg-primary/5">
            Conseillé
          </Badge>
        </div>
        
        <h4 className="font-display text-lg font-semibold text-foreground leading-tight">
          {themeTitle}
        </h4>
        {summary && (
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      {/* Structured steps with standard font size */}
      {steps.length > 0 ? (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="group flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-primary font-display text-xs font-bold shadow-sm transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                {idx + 1}
              </div>
              <p className="text-sm leading-relaxed text-foreground/85 group-hover:text-foreground pt-0.5">
                {step.replace(/^\w/, (c) => c.toUpperCase())}
                {!step.endsWith('.') && '.'}
              </p>
            </div>
          ))}
        </div>
      ) : practiceMode !== 'none' ? (
        <div className="flex items-center gap-3 rounded-lg bg-secondary/20 p-3 text-sm text-muted-foreground">
           <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-primary font-bold">1</div>
           <p>Relisez l'élocution et refaites une prise courte centrée sur ce point.</p>
        </div>
      ) : null}

      {/* Compact Plan Support */}
      {practiceMode === 'mini_plan_3_days' && practiceDays.length > 1 && (
        <div className="mt-5 border-t border-border/40 pt-4">
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-primary/70 hover:text-primary transition-colors flex items-center gap-2 uppercase tracking-tight">
              <span>Plan complet ({practiceDays.length - 1} jours)</span>
            </summary>
            <div className="mt-4 space-y-4">
              {practiceDays.slice(1).map((day) => (
                <div key={day.title} className="rounded-lg border border-border/40 bg-muted/5 p-4">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{day.title}</div>
                  <div className="space-y-2.5">
                    {day.items.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-start gap-2.5 text-sm text-foreground/70 leading-relaxed">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/30 mt-2 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}





