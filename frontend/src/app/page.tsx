'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Menu,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { LandingUserMenu } from '@/components/layout/LandingUserMenu';
import { AvatarCustom } from '@/components/ui/AvatarCustom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { FEEDBACK_ENDPOINTS } from '@/constants/api';
import { cn } from '@/lib/utils';

interface FeedbackItem {
  id: string;
  rating: number;
  comments: string | null;
  user_profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface FeedbackStats {
  average_rating: number;
  total_reviews: number;
}

const analysisPillars = [
  {
    title: 'Voix et rythme',
    description: 'Analyse du debit, pauses strategiques et hesitations avec objectifs personnalises.',
    icon: Mic,
    accent: 'violet',
    metric: '120-160',
    metricLabel: 'mots/min optimal',
  },
  {
    title: 'Presence visuelle',
    description: 'Contact visuel, visibilite des mains et stabilite dans le cadre video.',
    icon: Camera,
    accent: 'teal',
    metric: '>70%',
    metricLabel: 'contact visuel',
  },
  {
    title: 'Plan de progression',
    description: 'Score global, points forts et exercices concrets pour la prochaine session.',
    icon: ClipboardList,
    accent: 'amber',
    metric: '1',
    metricLabel: 'action prioritaire',
  },
];

const journeySteps = [
  {
    step: '01',
    title: 'Lancez votre session',
    description: 'Studio integre avec verifications automatiques camera et micro.',
    icon: Play,
  },
  {
    step: '02',
    title: 'Analyse en temps reel',
    description: 'IA analyse votre voix, presence et gestes instantanement.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Progressez immediatement',
    description: 'Rapport actionnable avec un objectif clair pour la suite.',
    icon: Target,
  },
];

const useCases = [
  { text: 'Soutenances academiques', icon: FileText },
  { text: 'Entretiens et concours', icon: Users },
  { text: 'Pitch et demos produit', icon: Target },
  { text: 'Entrainement quotidien', icon: BarChart3 },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay },
});

function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { href: '#produit', label: 'Produit' },
    { href: '#process', label: 'Methode' },
    { href: '#testimonials', label: 'Avis' },
  ] as const;

  React.useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.removeProperty('overflow');
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  return (
    <header className="nav-glass sticky top-0 z-[200] isolate">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground glow-primary transition-all duration-300 group-hover:scale-105">
            <Mic className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">SpeechCoach</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-4 py-2 transition-all duration-300 hover:bg-primary/5 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <LandingUserMenu />
              <Link 
                href="/studio" 
                className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex rounded-lg btn-glow')}
              >
                Studio
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex rounded-lg text-muted-foreground hover:text-foreground')}
              >
                Connexion
              </Link>
              <Link 
                href="/register" 
                className={cn(buttonVariants({ size: 'sm' }), 'rounded-lg btn-glow')}
              >
                Commencer
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-300 hover:bg-primary/5 hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            aria-label={mobileOpen ? 'Fermer menu' : 'Ouvrir menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="landing-mobile-nav" className="border-t border-primary/10 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-4">
            {navItems.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="block rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-primary/5"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default function LandingPage() {
  const { token } = useAuth();
  const [isMounted, setIsMounted] = React.useState(false);
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>([]);
  const [stats, setStats] = React.useState<FeedbackStats | null>(null);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = React.useState(true);

  React.useEffect(() => {
    setIsMounted(true);
    const loadFeedbackData = async () => {
      try {
        const [feedbackRes, statsRes] = await Promise.all([
          api.get(FEEDBACK_ENDPOINTS.PLATFORM_ALL),
          api.get(FEEDBACK_ENDPOINTS.PLATFORM_STATS),
        ]);
        setFeedbacks(feedbackRes.data.slice(0, 6));
        setStats(statsRes.data);
      } catch (error) {
        console.error('Landing feedback fetch failed:', error);
      } finally {
        setIsLoadingFeedbacks(false);
      }
    };
    loadFeedbackData();
  }, []);

  const isAuthenticated = Boolean(token);

  return (
    <div className="immersive-bg min-h-screen text-foreground" suppressHydrationWarning>
      {/* Animated gradient orbs */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      <div className="grid-pattern" />
      
      <LandingNav isAuthenticated={isMounted && isAuthenticated} />

      <main className="relative z-10">
        {/* Hero Section - Compact and impactful */}
        <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-20">
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:items-center">
            <motion.div {...fadeUp(0)} className="max-w-xl">
              <Badge 
                variant="secondary" 
                className="mb-5 rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary backdrop-blur-sm"
              >
                <Sparkles className="mr-1.5 h-3 w-3" />
                Coaching IA pour l&apos;oral
              </Badge>
              
              <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Transformez chaque{' '}
                <span className="gradient-text">prise de parole</span>{' '}
                en succes.
              </h1>
              
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Analyse IA de votre voix et presence. Metriques precises, feedback instantane, 
                progression visible des la premiere session.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href={isAuthenticated ? '/studio' : '/register'} 
                    className={cn(buttonVariants({ size: 'lg' }), 'rounded-xl btn-glow px-6 text-base')}
                  >
                    {isAuthenticated ? 'Lancer une analyse' : 'Essayer gratuitement'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
                
                <Link 
                  href="#produit" 
                  className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'rounded-xl text-muted-foreground hover:text-foreground px-6')}
                >
                  Voir un exemple
                </Link>
              </div>

              {/* Quick stats */}
              <div className="mt-10 flex items-center gap-6 border-t border-primary/10 pt-8">
                {[
                  ['142', 'mots/min'],
                  ['78%', 'contact visuel'],
                  ['85', 'score global'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="font-display text-2xl font-semibold gradient-text-subtle">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Hero Score Card */}
            <motion.div {...scaleIn(0.1)} className="relative">
              <div className="score-card rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-xs text-foreground">
                    Apercu rapport
                  </Badge>
                  <span className="text-xs text-muted-foreground">Demo live</span>
                </div>
                
                <div className="text-center mb-6">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Score global</div>
                  <div className="font-display text-7xl font-bold score-display sm:text-8xl">78</div>
                  <div className="mt-2 text-sm text-muted-foreground">Bon - Progression en cours</div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Point fort', value: 'Debit optimal et structure claire', color: 'text-emerald-400' },
                    { label: 'A ameliorer', value: 'Contact visuel a 52% (cible >70%)', color: 'text-amber-400' },
                    { label: 'Exercice', value: '3 prises courtes en fixant la camera', color: 'text-primary' },
                  ].map((item) => (
                    <motion.div 
                      key={item.label}
                      className="glass-card rounded-xl px-4 py-3"
                      whileHover={{ scale: 1.01, x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={cn('text-xs font-medium', item.color)}>{item.label}</div>
                      <div className="mt-1 text-sm text-foreground/90">{item.value}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Tighter spacing */}
        <section id="produit" className="relative py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-10">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Analyse <span className="gradient-text">complete</span> en une session
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Trois axes essentiels mesures avec precision pour une progression concrete.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {analysisPillars.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.08)}
                  className={cn(
                    'feature-card rounded-2xl p-6',
                    item.accent === 'violet' && 'feature-card-violet',
                    item.accent === 'teal' && 'feature-card-teal',
                    item.accent === 'amber' && 'feature-card-amber'
                  )}
                >
                  <div className={cn(
                    'icon-glow mb-4 flex h-11 w-11 items-center justify-center rounded-xl',
                    item.accent === 'violet' && 'bg-violet-500/15 text-violet-400',
                    item.accent === 'teal' && 'bg-teal-500/15 text-teal-400',
                    item.accent === 'amber' && 'bg-amber-500/15 text-amber-400'
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  
                  <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <div className={cn(
                      'text-xl font-bold',
                      item.accent === 'violet' && 'text-violet-400',
                      item.accent === 'teal' && 'text-teal-400',
                      item.accent === 'amber' && 'text-amber-400'
                    )}>
                      {item.metric}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.metricLabel}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section - Horizontal layout */}
        <section id="process" className="relative py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-10">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Simple. Rapide. <span className="gradient-text">Efficace.</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                De la prise de parole au plan d&apos;action en quelques minutes.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {journeySteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  {...fadeUp(i * 0.1)}
                  className="feature-card feature-card-violet rounded-2xl p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="mb-2 font-mono text-xs text-primary/60">{step.step}</div>
                  <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Use cases - inline */}
            <motion.div {...fadeUp(0.3)} className="mt-10">
              <div className="glass-card-strong rounded-2xl p-6">
                <div className="text-center mb-4">
                  <div className="text-sm font-medium text-foreground">Ideal pour</div>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {useCases.map((item) => (
                    <div 
                      key={item.text}
                      className="metric-badge flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      <span className="text-foreground/80">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="relative py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-10">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ils progressent avec <span className="gradient-text">SpeechCoach</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Retours authentiques de nos utilisateurs.
              </p>
            </motion.div>

            {/* Stats banner */}
            {stats && (
              <motion.div
                {...fadeUp(0.06)}
                className="glass-card-strong mb-8 grid grid-cols-3 gap-4 rounded-2xl p-6"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{stats.average_rating.toFixed(1)}/5</div>
                  <div className="text-xs text-muted-foreground">Note moyenne</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{Math.round((stats.average_rating / 5) * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{stats.total_reviews}</div>
                  <div className="text-xs text-muted-foreground">Avis verifies</div>
                </div>
              </motion.div>
            )}

            {/* Review cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {isLoadingFeedbacks ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl glass-card" />
                ))
              ) : feedbacks.length > 0 ? (
                feedbacks.slice(0, 3).map((item, i) => {
                  const name = item.user_profile?.full_name || 'Utilisateur anonyme';
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
                    <motion.div
                      key={item.id}
                      {...fadeUp(i * 0.08)}
                      className="testimonial-card relative flex flex-col justify-between rounded-2xl p-6"
                    >
                      <div className="pointer-events-none absolute right-4 top-2 font-serif text-6xl leading-none text-primary/10 select-none">
                        &ldquo;
                      </div>

                      <div>
                        <RatingStars rating={item.rating} editable={false} size="sm" />
                        <p className="relative mt-4 text-sm leading-relaxed text-foreground/80">
                          {item.comments || 'Analyse claire, recommandations precises et progression visible des les premieres sessions.'}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center gap-3 border-t border-primary/10 pt-4">
                        {item.user_profile?.avatar_url ? (
                          <AvatarCustom
                            src={item.user_profile.avatar_url}
                            name={name}
                            size="sm"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white',
                              gradients[i % gradients.length]
                            )}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Avis verifie
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl glass-card px-6 py-12 text-center text-sm text-muted-foreground">
                  Les premiers avis apparaitront ici.
                </div>
              )}
            </div>

            {feedbacks.length > 0 && (
              <motion.div {...fadeUp(0.3)} className="mt-6 flex items-center justify-center gap-4">
                <Link
                  href="/public-feedback"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 rounded-lg border-primary/20 hover:bg-primary/5')}
                >
                  Voir tous les avis
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {token && (
                  <Link
                    href="/settings?tab=feedback"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground rounded-lg')}
                  >
                    Donner mon avis
                  </Link>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div 
              {...scaleIn(0)}
              className="cta-section rounded-2xl px-6 py-12 text-center sm:px-12 sm:py-16"
            >
              <Badge variant="secondary" className="mb-4 rounded-full bg-white/15 px-3 py-1 text-xs text-white">
                Pret a progresser
              </Badge>
              
              <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                Votre prochaine prise de parole commence ici.
              </h2>
              
              <p className="mt-4 text-sm text-white/70 max-w-xl mx-auto sm:text-base">
                Lancez une session, obtenez un feedback precis et appliquez une action concrete des aujourd&apos;hui.
              </p>
              
              <div className="mt-8">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-block"
                >
                  <Link 
                    href={isAuthenticated ? '/studio' : '/register'} 
                    className={cn(
                      buttonVariants({ size: 'lg' }), 
                      'rounded-xl bg-white text-primary hover:bg-white/90 px-8 text-base font-semibold'
                    )}
                  >
                    {isAuthenticated ? 'Ouvrir le studio' : 'Creer un compte gratuit'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer-section relative z-10 border-t border-primary/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground glow-primary transition-all duration-300 group-hover:scale-105">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-base font-semibold">SpeechCoach</div>
              <div className="text-xs text-muted-foreground">Coaching oral par IA</div>
            </div>
          </Link>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <Link href="#produit" className="transition-colors duration-300 hover:text-foreground">Produit</Link>
            <Link href="#process" className="transition-colors duration-300 hover:text-foreground">Methode</Link>
            <Link href="#testimonials" className="transition-colors duration-300 hover:text-foreground">Avis</Link>
            <span className="text-muted-foreground/50">2026 SpeechCoach</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
