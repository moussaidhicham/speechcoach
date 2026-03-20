'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/context/auth-context';
import { OnboardingWizard } from '@/features/auth/onboarding-wizard';
import { formatReportDate } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { videoService } from '@/services/video.service';
import {
  DashboardCoachingSnapshot,
  DashboardSummary,
  ReportRecommendation,
  SessionHistory,
} from '@/types/analytics';
import { UserProfile } from '@/types/auth';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
  icon: React.ComponentType<{ className?: string }>;
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [dashboardSummary, setDashboardSummary] = React.useState<DashboardSummary | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [showWizard, setShowWizard] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [summaryData, profileData] = await Promise.all([
        videoService.getDashboardSummary(),
        authService.getProfile(),
      ]);
      setDashboardSummary(summaryData);
      setProfile(profileData);
      if (!profileData.full_name || !profileData.current_goal) setShowWizard(true);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (token) fetchData().catch(() => undefined);
  }, [fetchData, token]);

  const handleWizardComplete = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setShowWizard(false);
    toast.success(`Bienvenue, ${updatedProfile.full_name?.split(' ')[0] || 'coach'} !`);
  };

  const chartData = (dashboardSummary?.progress_chart || []).map((point) => ({
    date: new Date(point.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    score: point.score,
    wpm: point.wpm,
  }));

  const recentSessions = dashboardSummary?.recent_sessions || [];

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Bienvenue, ${profile?.full_name || user?.email || 'coach'}`}
      actions={
        <Link href="/studio" className={buttonVariants({ size: 'sm' })}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nouvelle analyse
        </Link>
      }
      maxWidth="7xl"
    >
      <AnimatePresence>
        {showWizard ? <OnboardingWizard onComplete={handleWizardComplete} /> : null}
      </AnimatePresence>

      <div className="space-y-8">

        {/* ── Hero banner ───────────────────────────────────────────── */}
        <section className="rounded-3xl border border-border/60 bg-card p-7 lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Badge variant="secondary" className="mb-4 bg-accent text-accent-foreground">
                Coach workspace
              </Badge>
              <h2 className="font-display max-w-xl text-3xl font-medium leading-snug sm:text-4xl">
                Un tableau de bord qui ressemble à une salle de revue,{' '}
                <em className="not-italic text-primary">pas à une grille de cartes.</em>
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                Suivez la progression, ouvrez votre dernier rapport et gardez le prochain
                exercice de répétition sous les yeux.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Dernière lecture',  recentSessions[0]?.title || 'Aucune session'],
                ['Prochain geste',    dashboardSummary?.latest_coaching?.primary_focus || 'Lancez une analyse'],
                ['Cadence',           `${dashboardSummary?.total_sessions || 0} sessions`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-5">
                  <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    {label}
                  </div>
                  <div
                    className="mt-3 line-clamp-3 break-words text-sm font-medium leading-relaxed text-foreground"
                    title={value}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Error state ───────────────────────────────────────────── */}
        {isError && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-lg font-medium">
                  Le dashboard ne s'est pas chargé correctement
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Nous n'avons pas pu récupérer vos statistiques ou votre profil.
                  Vous pouvez relancer le chargement sans quitter la page.
                </p>
              </div>
              <Button onClick={() => fetchData()} className="shrink-0">
                Recharger
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Stat cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Score moyen"
                value={`${dashboardSummary?.average_score || 0}%`}
                subValue="Sur les vidéos terminées"
                icon={TrendingUp}
              />
              <StatCard
                label="Analyses totales"
                value={`${dashboardSummary?.total_sessions || 0}`}
                subValue="Sessions enregistrées"
                icon={Video}
              />
              <StatCard
                label="Score max"
                value={`${dashboardSummary?.best_score || 0}%`}
                subValue="Meilleure performance"
                icon={CheckCircle2}
              />
              <StatCard
                label="Temps pratique"
                value={`${dashboardSummary?.total_practice_minutes || 0} min`}
                subValue="Temps d'entraînement cumulé"
                icon={Clock}
              />
            </>
          )}
        </div>

        {/* ── Chart + recent sessions ───────────────────────────────── */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Progression des scores</CardTitle>
              <CardDescription>
                Évolution de votre performance globale au fil des analyses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="dashboardScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          boxShadow: '0 8px 24px -8px hsl(var(--foreground)/0.12)',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#dashboardScore)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState />
                )}
              </div>
            </CardContent>
          </Card>

          <RecentAnalyses recentSessions={recentSessions} />
        </div>

        {/* ── Coach recommendations ─────────────────────────────────── */}
        <Recommendations
          latestCoaching={dashboardSummary?.latest_coaching || null}
          isLoading={isLoading}
        />
      </div>
    </AppShell>
  );
}

/* ─── StatCard ───────────────────────────────────────────────────────── */

function StatCard({ label, value, subValue, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="px-6 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="font-display text-3xl font-medium text-foreground">{value}</div>
        <p className="mt-1.5 text-xs text-muted-foreground">{subValue}</p>
      </CardContent>
    </Card>
  );
}

/* ─── RecentAnalyses ─────────────────────────────────────────────────── */

function RecentAnalyses({ recentSessions }: { recentSessions: SessionHistory[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Dernières analyses</CardTitle>
        <CardDescription>Accès rapide à vos sessions les plus récentes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {recentSessions.length > 0 ? (
          recentSessions.map((item) => (
            <Link
              key={item.session_id}
              href={item.status === 'completed' ? `/report/${item.session_id}` : '/history'}
              className="rounded-xl border border-border/60 bg-background/70 px-4 py-3.5 transition-colors hover:bg-secondary/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {item.title || `Session ${item.session_id.slice(0, 8)}`}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    item.status === 'completed' && 'bg-primary/10 text-primary'
                  )}
                >
                  {item.status === 'completed' ? `${item.overall_score}%` : item.status}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun historique pour le moment.
          </p>
        )}
        <Link
          href="/history"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-auto w-full')}
        >
          Voir tout l'historique
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-secondary/30 p-8 text-center">
      <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Pas encore assez de données.</p>
      <Link href="/studio">
        <Button variant="outline" size="sm">
          Faire ma première analyse
        </Button>
      </Link>
    </div>
  );
}

/* ─── Recommendations ────────────────────────────────────────────────── */

function Recommendations({
  latestCoaching,
  isLoading,
}: {
  latestCoaching: DashboardCoachingSnapshot | null;
  isLoading: boolean;
}) {
  const sectionHeader = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="font-display text-2xl font-medium">Priorités du coach</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Chargement des recommandations issues de votre dernier rapport.'
            : latestCoaching
            ? 'Conseils issus de votre dernier rapport complet.'
            : 'Les recommandations apparaîtront ici après votre première analyse terminée.'}
        </p>
      </div>
      {latestCoaching && !isLoading && (
        <Link
          href={`/report/${latestCoaching.session_id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit')}
        >
          Ouvrir le dernier rapport
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        {sectionHeader}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!latestCoaching) {
    return (
      <div className="space-y-5">
        {sectionHeader}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <Sparkles className="h-7 w-7 text-primary/40" />
            <div>
              <div className="font-display text-lg font-medium">
                Aucune recommandation détaillée pour le moment
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Lancez une session dans le studio pour débloquer un coaching basé
                sur votre rapport le plus récent.
              </p>
            </div>
            <Link href="/studio">
              <Button>
                Nouvelle analyse
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sectionHeader}

      {/* Main insight + next practice */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Latest session insight */}
        <Card className="overflow-hidden">
          <CardContent className="p-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">
                  Dernière session analysée
                </Badge>
                <h3 className="font-display text-2xl font-medium">{latestCoaching.priority_focus}</h3>
                <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {latestCoaching.narrative}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5 text-center">
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Score
                </div>
                <div className="mt-2 font-mono text-3xl font-medium text-primary">
                  {latestCoaching.overall_score}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DashboardInsightStat
                label="Session"
                value={latestCoaching.title}
                helper={formatReportDate(latestCoaching.created_at)}
              />
              <DashboardInsightStat
                label="Focus principal"
                value={latestCoaching.primary_focus || latestCoaching.priority_focus}
                helper="Direction recommandée"
              />
              <DashboardInsightStat
                label="Point fort à conserver"
                value={latestCoaching.first_strength || 'Progression stable'}
                helper="Élément positif détecté"
              />
            </div>
          </CardContent>
        </Card>

        {/* Next practice */}
        <Card>
          <CardHeader>
            <CardTitle>Prochaine répétition</CardTitle>
            <CardDescription>
              Le premier bloc de pratique suggéré par le plan d'entraînement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="rounded-xl bg-secondary/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Target className="h-3.5 w-3.5 shrink-0 text-primary" />
                {latestCoaching.next_practice_title || 'Bloc prioritaire'}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {latestCoaching.next_practice_step ||
                  'Reprenez votre discours en appliquant la première recommandation du rapport.'}
              </p>
            </div>
            {latestCoaching.encouragement && (
              <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Encouragement — </span>
                {latestCoaching.encouragement}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendation cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {latestCoaching.recommendations.length > 0 ? (
          latestCoaching.recommendations.map((recommendation) => (
            <CoachRecommendationCard
              key={`${recommendation.category}-${recommendation.message}`}
              recommendation={recommendation}
            />
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="p-6 text-sm leading-relaxed text-muted-foreground">
              Le dernier rapport ne contient pas encore de recommandations structurées.
              Le focus principal reste disponible ci-dessus.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── DashboardInsightStat ───────────────────────────────────────────── */

function DashboardInsightStat({ label, value, helper }: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/70 px-4 py-4">
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-2 line-clamp-3 break-words text-sm font-medium leading-relaxed text-foreground"
        title={value}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{helper}</div>
    </div>
  );
}

/* ─── CoachRecommendationCard ────────────────────────────────────────── */

function CoachRecommendationCard({ recommendation }: { recommendation: ReportRecommendation }) {
  const severity = recommendation.severity.toLowerCase();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-medium">{recommendation.category}</h3>
              <div className="text-xs text-muted-foreground">Recommandation</div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              severity === 'critical' && 'border-destructive/25 bg-destructive/10 text-destructive',
              severity === 'warning'  && 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
              severity === 'info'     && 'border-primary/20 bg-primary/10 text-primary'
            )}
          >
            {recommendation.severity}
          </Badge>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{recommendation.message}</p>

        <div className="mt-4 rounded-xl bg-secondary/50 px-4 py-3.5 text-sm leading-relaxed text-foreground">
          <span className="font-medium">Action terrain — </span>
          {recommendation.tip}
        </div>
      </CardContent>
    </Card>
  );
}
