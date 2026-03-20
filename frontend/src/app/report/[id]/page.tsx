'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FileText,
  Mic,
  PauseCircle,
  Sparkles,
  User,
  Video,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
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
  buildMarkdownReport,
  formatDuration,
  formatLanguage,
  formatReportDate,
  getScoreVerdict,
} from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { videoService } from '@/services/video.service';
import { ReportRecommendation, ReportResult, ReportTrainingDay } from '@/types/analytics';
import { useAuth } from '@/context/auth-context';

/* ─── Types ──────────────────────────────────────────────────────────── */

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
  return `${resolution[0]}×${resolution[1]}`;
}

function formatFpsValue(fps: number) {
  if (!Number.isFinite(fps) || fps <= 1) {
    return 'Non renseigne';
  }
  return `${Number(fps.toFixed(2)).toString()}`;
}

/* ─── Page ───────────────────────────────────────────────────────────── */

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

  const handleExportMarkdown = React.useCallback(async () => {
    if (!report || !sessionId) return;
    setIsExportingMarkdown(true);
    try {
      const blob = await videoService.getMarkdownExport(sessionId);
      downloadBlob(blob, `speechcoach-report-${sessionId}.md`);
      toast.success('Export Markdown prêt.');
    } catch {
      const content = buildMarkdownReport(report);
      downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), `speechcoach-report-${sessionId}.md`);
      toast.success('Export Markdown généré localement.');
    } finally {
      setIsExportingMarkdown(false);
    }
  }, [report, sessionId]);

  const handleExportPdf = React.useCallback(async () => {
    if (!sessionId) return;
    setIsExportingPdf(true);
    try {
      const blob = await videoService.getPdfExport(sessionId);
      downloadBlob(blob, `speechcoach-report-${sessionId}.pdf`);
      toast.success('Export PDF prêt.');
    } catch {
      toast.error('Export PDF indisponible pour le moment.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [sessionId]);

  const handleCopyLink = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Lien du rapport copié.');
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
        {isExportingMarkdown ? 'Génération…' : 'Markdown'}
      </Button>
      <Button size="sm" onClick={handleExportPdf} disabled={isExportingPdf}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        {isExportingPdf ? 'Préparation…' : 'Export PDF'}
      </Button>
    </div>
  ) : null;

  return (
    <AppShell
      title={report?.session.title || 'Rapport'}
      subtitle={
        report
          ? `Session du ${formatReportDate(report.session.created_at)}`
          : 'Lecture détaillée de votre analyse'
      }
      actions={actions}
      maxWidth="7xl"
    >
      {isLoading  && <ReportLoadingState />}
      {!isLoading && !report && <ReportEmptyState onRetry={fetchReport} />}
      {!isLoading && report && (
        <article className="space-y-7 print-container" aria-label="Rapport d'analyse SpeechCoach">

          {/* ── Hero: summary + video ──────────────────────────────── */}
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">

            {/* Summary card */}
            <Card className="print-card overflow-hidden">
              <CardHeader className="border-b border-border/60 bg-background/60 px-7 py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                      Résumé exécutif
                    </Badge>
                    <CardTitle>{report.summary.headline}</CardTitle>
                    <CardDescription className="mt-2.5 max-w-2xl text-sm leading-relaxed">
                      {report.summary.narrative}
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5 text-right">
                    <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                      Priorité
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {report.summary.priority_focus}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid gap-6 p-7 lg:grid-cols-[1fr_0.9fr]">
                {/* Left: meta + focus */}
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SessionMetaCard label="Date"   value={formatReportDate(report.session.created_at)} />
                    <SessionMetaCard label="Durée"  value={formatDuration(report.session.duration_seconds)} />
                    <SessionMetaCard label="Langue" value={formatLanguage(report.session.language)} />
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
                    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Ce que le rapport veut vous faire travailler en premier
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {report.summary.priority_focus}
                    </p>
                    {report.summary.encouragement && (
                      <p className="mt-3.5 rounded-xl bg-primary/8 px-4 py-3 text-sm leading-relaxed text-foreground">
                        {report.summary.encouragement}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: score block */}
                <div className="data-ribbon rounded-2xl p-6">
                  <div className="text-[11px] font-medium uppercase tracking-widest text-primary-foreground/60">
                    Score global
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="font-display text-6xl font-medium leading-none text-primary-foreground">
                        {report.summary.overall_score}
                      </div>
                      <div className="mt-2 text-sm text-primary-foreground/60">/100</div>
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-medium text-primary-foreground">
                      {getScoreVerdict(report.summary.overall_score)}
                    </div>
                  </div>
                  <div className="mt-7 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-primary-foreground/60">
                        <span>Préparation globale</span>
                        <span>{report.summary.overall_score}%</span>
                      </div>
                      <Progress
                        value={report.summary.overall_score}
                        className="w-full"
                        trackClassName="bg-white/20"
                        indicatorClassName="bg-white"
                      />
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <MiniMetricCard label="Résolution" value={formatResolutionValue(report.session.resolution)} />
                      <MiniMetricCard label="FPS" value={formatFpsValue(report.session.fps)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right column: video + score breakdown */}
            <div className="flex flex-col gap-6">
              {report.session.video_url && (
                <Card className="no-print overflow-hidden print-card">
                  <CardHeader>
                    <CardTitle>Vidéo analysée</CardTitle>
                    <CardDescription>Relisez la session en parallèle du rapport.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-black">
                      <video
                        src={`${apiBaseUrl}${report.session.video_url}`}
                        controls
                        className="aspect-video w-full object-contain"
                        aria-label="Vidéo analysée"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="print-card flex-1">
                <CardHeader>
                  <CardTitle>Scores détaillés</CardTitle>
                  <CardDescription>Les blocs qui composent la note globale.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <ScoreCard label="Voix"     value={report.scores.voice}          icon={Mic}  helper="Rythme, fluidité et projection" />
                  <ScoreCard label="Corps"    value={report.scores.body_language}   icon={User} helper="Posture et gestuelle" />
                  <ScoreCard label="Présence" value={report.scores.presence}        icon={Video} helper="Occupation du cadre" />
                  <ScoreCard label="Regard"   value={report.scores.eye_contact}     icon={Eye}  helper="Connexion caméra" />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Strengths + Weaknesses ─────────────────────────────── */}
          <section className="grid gap-6 lg:grid-cols-2">
            <ListSectionCard
              title="Points forts"
              description="Ce qui donne déjà de la crédibilité à votre prise de parole."
              icon={CheckCircle2}
              items={report.strengths}
              tone="success"
            />
            <ListSectionCard
              title="Axes de progression"
              description="Les éléments à corriger en priorité pour la prochaine répétition."
              icon={ArrowRight}
              items={report.weaknesses}
              tone="warning"
            />
          </section>

          {/* ── Metrics + Recommendations ──────────────────────────── */}
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">

            {/* Metrics card */}
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Indicateurs et preuves</CardTitle>
                <CardDescription>
                  Les mesures qui soutiennent les recommandations.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
                {/* Radar */}
                <div
                  className="h-60 w-full"
                  role="img"
                  aria-label="Radar des scores voix, corps, présence, scène et regard"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%" cy="50%" outerRadius="72%"
                      data={[
                        { subject: 'Voix',     value: report.scores.voice },
                        { subject: 'Corps',    value: report.scores.body_language },
                        { subject: 'Présence', value: report.scores.presence },
                        { subject: 'Scène',    value: report.scores.scene },
                        { subject: 'Regard',   value: report.scores.eye_contact },
                      ]}
                    >
                      <PolarGrid opacity={0.14} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <Radar
                        name="Performance"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ratio bars */}
                <div className="grid gap-3">
                  <MetricProgressCard
                    label="Contact visuel"
                    value={report.metrics.eye_contact_ratio}
                    description="Temps passé à regarder la caméra"
                    icon={Eye}
                  />
                  <MetricProgressCard
                    label="Présence visage"
                    value={report.metrics.face_presence_ratio}
                    description="Stabilité du cadrage"
                    icon={Camera}
                  />
                  <MetricProgressCard
                    label="Visibilité mains"
                    value={report.metrics.hands_visibility_ratio}
                    description="Mesure de la gestuelle"
                    icon={User}
                  />
                </div>
              </CardContent>

              {/* Stat row */}
              <CardContent className="grid gap-3 border-t border-border/60 p-6 sm:grid-cols-2 xl:grid-cols-4">
                <MetricStatCard icon={Mic}          label="Débit vocal"     value={`${report.metrics.wpm} WPM`} />
                <MetricStatCard icon={PauseCircle}  label="Pauses"          value={`${report.metrics.pause_count}`} />
                <MetricStatCard icon={ClipboardList} label="Fillers"        value={`${report.metrics.filler_count}`} />
                <MetricStatCard icon={WandSparkles}  label="Mains actives"  value={`${report.metrics.hands_activity_score}`} />
              </CardContent>
            </Card>

            {/* Recommendations card */}
            <Card className="print-card">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle>Recommandations prioritaires</CardTitle>
                    <CardDescription>
                      Des actions concrètes à tester dès la prochaine répétition.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Focus : {report.training_plan.focus_primary || 'Général'}
                    </Badge>
                    {report.training_plan.focus_secondary && (
                      <Badge variant="outline">
                        Secondaire : {report.training_plan.focus_secondary}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.recommendations.length > 0 ? (
                  report.recommendations.map((item) => (
                    <RecommendationCard
                      key={`${item.category}-${item.message}`}
                      recommendation={item}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                    Aucune recommandation détaillée n'a été fournie pour cette session.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ── Training plan + Context ────────────────────────────── */}
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Plan de pratique</CardTitle>
                <CardDescription>
                  Une proposition d'entraînement à suivre entre cette session et la suivante.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.training_plan.days.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {report.training_plan.days.map((day) => (
                      <TrainingDayCard key={day.title} day={day} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-secondary/40 p-5 text-sm leading-relaxed text-muted-foreground">
                    Le plan détaillé n'a pas encore été structuré pour cette session.
                    Utilisez les recommandations ci-dessus comme feuille de route immédiate.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader>
                <CardTitle>Notes utiles</CardTitle>
                <CardDescription>
                  Contexte technique et indicateurs complémentaires.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                <ContextRow label="Qualité de scène"  value={`${report.scores.scene}/100`} />
                <ContextRow label="Luminosité"         value={`${report.metrics.brightness}`} />
                <ContextRow label="Netteté"            value={`${report.metrics.blur}`} />
                <ContextRow label="Pause cumulée"      value={`${report.metrics.pause_duration_total}s`} />
                <ContextRow label="Session ID"         value={report.session.id.slice(0, 8)} mono />
                <ContextRow label="Verdict"            value={getScoreVerdict(report.summary.overall_score)} />
              </CardContent>
            </Card>
          </section>

          {/* ── Transcript ────────────────────────────────────────────── */}
          <section>
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Transcription</CardTitle>
                <CardDescription>
                  Conservez la transcription complète pour vos relectures ou vos exports Markdown.
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
                            {segment.start.toFixed(1)}s – {segment.end.toFixed(1)}s
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

          {/* ── Feedback ──────────────────────────────────────────────── */}
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

/* ─── Helpers ────────────────────────────────────────────────────────── */

function downloadBlob(blob: Blob, filename: string) {
  const url  = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Loading / Empty ────────────────────────────────────────────────── */

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
            Cette session n'est peut-être pas terminée, ou elle n'est plus disponible
            dans votre historique.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={onRetry}>Recharger</Button>
          <Link href="/history">
            <Button>
              Retour à l'historique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Small components ───────────────────────────────────────────────── */

function SessionMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/70 px-4 py-3.5">
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className="mt-2 max-w-full break-words text-sm font-medium leading-snug text-foreground"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function MiniMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/15 bg-white/10 px-4 py-3.5">
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

function MetricStatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-mono text-lg font-medium text-foreground">{value}</div>
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
            Aucune information détaillée n'a été fournie dans cette section.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ReportRecommendation }) {
  const severity = recommendation.severity.toLowerCase();
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-base font-medium text-foreground">
            {recommendation.category}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {recommendation.message}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            severity === 'critical' && 'border-destructive/25 bg-destructive/10 text-destructive',
            severity === 'warning'  && 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
            severity === 'info'     && 'border-primary/20 bg-primary/10 text-primary'
          )}
        >
          {recommendation.severity || 'Info'}
        </Badge>
      </div>
      <div className="mt-3.5 rounded-xl bg-secondary/50 px-4 py-3.5 text-sm leading-relaxed text-foreground">
        <span className="font-medium">Action terrain — </span>
        {recommendation.tip || 'Continuez à pratiquer avec la même exigence.'}
      </div>
    </div>
  );
}

function TrainingDayCard({ day }: { day: ReportTrainingDay }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-5">
      <div className="text-sm font-medium text-foreground">{day.title}</div>
      <div className="mt-3 space-y-2">
        {day.items.length > 0 ? (
          day.items.map((item) => (
            <div key={item} className="rounded-lg bg-secondary/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-secondary/50 px-3.5 py-2.5 text-sm text-muted-foreground">
            Pas de détail supplémentaire pour ce bloc.
          </div>
        )}
      </div>
    </div>
  );
}

function ContextRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium text-foreground', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  );
}





