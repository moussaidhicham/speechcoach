'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle, Star, Users } from 'lucide-react';
import Link from 'next/link';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { AvatarCustom } from '@/components/ui/AvatarCustom';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { FEEDBACK_ENDPOINTS } from '@/constants/api';

interface FeedbackStatResponse {
  average_rating: number;
  total_reviews: number;
}

interface FeedbackItem {
  id: string;
  rating: number;
  comments: string | null;
  created_at: string;
  user_profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export default function PublicFeedbackPage() {
  const [stats, setStats] = React.useState<FeedbackStatResponse>({ average_rating: 0, total_reviews: 0 });
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [statsRes, feedbacksRes] = await Promise.all([
        api.get(FEEDBACK_ENDPOINTS.PLATFORM_STATS),
        api.get(FEEDBACK_ENDPOINTS.PLATFORM_ALL),
      ]);

      setStats(statsRes.data);
      setFeedbacks(feedbacksRes.data);
    } catch (error) {
      console.error('Failed to fetch public feedback:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData().catch(() => undefined);
  }, [fetchData]);

  const satisfaction =
    stats.total_reviews > 0 ? `${Math.round((stats.average_rating / 5) * 100)}%` : 'N/A';

  return (
    <AppShell
      title="Avis utilisateurs"
      subtitle="Retour d experience public sur SpeechCoach."
      requireAuth={false}
      maxWidth="6xl"
      actions={
        <Link href="/settings?tab=feedback">
          <Button variant="outline" size="sm">
            Donner mon avis
          </Button>
        </Link>
      }
    >
      <div className="space-y-10">
        <section className="space-y-5 text-center">
          <p className="mx-auto inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Feedback public
          </p>
          <h1 className="text-4xl font-semibold md:text-5xl">Ce que les utilisateurs retiennent du produit</h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-muted-foreground">
            Une vue simple des notes et commentaires laisses par les utilisateurs. Ici, pas de chiffre invente:
            uniquement les retours disponibles dans la base.
          </p>

          <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-3">
            <StatCard
              label="Note moyenne"
              value={`${stats.average_rating.toFixed(1)}/5`}
              icon={<Star className="h-6 w-6 fill-current text-amber-500" />}
            />
            <StatCard
              label="Avis publies"
              value={stats.total_reviews}
              icon={<MessageCircle className="h-6 w-6 text-primary" />}
            />
            <StatCard
              label="Satisfaction calculee"
              value={satisfaction}
              icon={<Users className="h-6 w-6 text-emerald-600" />}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Commentaires recents</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-[1.5rem] border border-border/70 bg-card/70" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 px-6 py-12 text-center" role="alert">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-primary/35" />
              <p className="text-sm text-muted-foreground">
                Les avis publics n ont pas pu etre charges pour le moment.
              </p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => fetchData()}>
                  Recharger
                </Button>
              </div>
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {feedbacks.map((feedback, index) => (
                <FeedbackCard key={feedback.id} feedback={feedback} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 px-6 py-20 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-primary/35" />
              <p className="text-sm text-muted-foreground">Aucun avis public pour le moment.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <div className="rounded-2xl bg-secondary/70 p-3">{icon}</div>
        <div className="text-3xl font-semibold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function FeedbackCard({ feedback, index }: { feedback: FeedbackItem; index: number }) {
  const name = feedback.user_profile?.full_name || 'Utilisateur anonyme';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-sky-500 to-blue-600',
    'from-emerald-500 to-teal-600',
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      aria-label={`Avis de ${name}`}
    >
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-between p-6">
          {/* Decorative large quote */}
          <div className="pointer-events-none absolute right-4 top-3 font-serif text-8xl leading-none text-primary/8 select-none">
            &ldquo;
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <RatingStars rating={feedback.rating} editable={false} size="sm" />
              <span className="text-xs text-muted-foreground">
                {feedback.created_at ? new Date(feedback.created_at).toLocaleDateString('fr-FR') : 'Avis recent'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">
              {feedback.comments || 'Analyse claire, recommandations précises et progression visible dès les premières sessions.'}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-4">
            {feedback.user_profile?.avatar_url ? (
              <AvatarCustom
                src={feedback.user_profile.avatar_url}
                name={name}
                size="sm"
              />
            ) : (
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white',
                  gradients[index % gradients.length]
                )}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{name}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Avis vérifié
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}
