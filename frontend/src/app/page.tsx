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
  LayoutDashboard,
  LineChart,
  LogOut,
  Mic,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

/* ─── Data ──────────────────────────────────────────────────────────── */

const capabilities = [
  {
    title: 'Analyse vocale',
    description:
      "Mesurez le rythme, les pauses, la fluidite et la regularite de votre voix avec un feedback facile a exploiter.",
    icon: Mic,
    points: ['Debit vocal interpretable', 'Pauses et fillers visibles', 'Lecture claire des priorites'],
  },
  {
    title: 'Analyse visuelle',
    description:
      "Suivez le regard, la presence dans le cadre, la posture et la qualite de votre environnement.",
    icon: Camera,
    points: ['Contact visuel', 'Presence visage', 'Qualite du cadrage'],
  },
  {
    title: 'Coaching structure',
    description:
      "Chaque session se termine par un rapport partageable avec forces, points a corriger et un plan d'action personnalise.",
    icon: ClipboardList,
    points: ['Resume executif', 'Recommandations prioritaires', "Plan d'action"],
  },
];

const workflow = [
  {
    title: 'Enregistrer ou importer',
    description:
      'Le studio vous guide avant la capture pour eviter les videos mal cadrees ou difficilement exploitables.',
  },
  {
    title: 'Lancer le traitement',
    description:
      "Le systeme analyse la voix, le regard, la presence et les signaux de scene dans un pipeline unique.",
  },
  {
    title: 'Lire puis partager',
    description:
      "Le rapport met en avant le score, les preuves utiles et un plan de progression au format web, PDF ou Markdown.",
  },
];

const audiences = [
  'Soutenances et presentations academiques',
  'Entretiens et oral de concours',
  'Pitch deck, demo day et presentations produit',
];

/* ─── Fade-up animation preset ──────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
});

const fadeUpInView = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
});

/* ─── Product preview ───────────────────────────────────────────────── */

function ProductPreview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Studio card */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="border-b border-border/60 bg-background/60 px-7 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                Studio guide
              </Badge>
              <CardTitle className="font-display text-2xl font-medium leading-snug">
                Une capture pensee pour reussir <em>du premier coup</em>
              </CardTitle>
              <CardDescription className="mt-3 max-w-sm text-sm leading-relaxed">
                Statut clair, preparation rapide et prochaine action toujours visible.
              </CardDescription>
            </div>
            <div className="hidden shrink-0 rounded-2xl border border-primary/15 bg-primary/8 p-3.5 text-primary lg:block">
              <Video className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-7 sm:grid-cols-2">
          {/* Pre-check panel */}
          <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Avant la prise
              </span>
              <Badge variant="outline" className="text-xs">3 checks</Badge>
            </div>
            <div className="space-y-2.5">
              {['Camera active', 'Micro detecte', 'Cadrage stable'].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          {/* Live panel */}
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Pendant l'analyse
              </span>
              <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">
                En cours
              </span>
            </div>
            <div className="studio-stage rounded-xl p-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50">
                <span>Recording</span>
                <span>REC 02:14</span>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {[['Audio', 'Niveau stable'], ['Presence', 'Cadre valide']].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white/10 p-3 backdrop-blur">
                    <div className="text-[10px] uppercase tracking-widest text-white/50">{k}</div>
                    <div className="mt-1.5 text-base font-medium text-white">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report card */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="border-b border-border/60 bg-background/60 px-7 py-6">
          <Badge variant="secondary" className="mb-4 w-fit bg-accent text-accent-foreground">
            Rapport professionnel
          </Badge>
          <CardTitle className="font-display text-2xl font-medium leading-snug">
            Un rendu clair pour relire, partager et <em>progresser</em>
          </CardTitle>
          <CardDescription className="mt-3 text-sm leading-relaxed">
            Score, preuves utiles et actions a appliquer des la prochaine repetition.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-7">
          {/* Score block */}
          <div className="data-ribbon rounded-2xl p-6">
            <div className="text-[11px] font-medium uppercase tracking-widest text-primary-foreground/60">
              Score global
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <div className="font-display text-6xl font-medium leading-none text-primary-foreground">
                  84
                </div>
                <p className="mt-2.5 max-w-[14rem] text-sm leading-relaxed text-primary-foreground/75">
                  Presentation convaincante - axe prioritaire sur le regard.
                </p>
              </div>
              <LineChart className="h-9 w-9 shrink-0 text-primary-foreground/60" />
            </div>
          </div>
          {/* Feedback rows */}
          <div className="space-y-2.5">
            {[
              ['Force', 'Structure orale claire et rythme stable.'],
              ['A corriger', 'Regarder la camera dans les transitions.'],
              ["Plan d'action", '2 repetitions de 90 secondes sans notes.'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/60 bg-background/70 px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1.5 text-sm leading-relaxed text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { token, user, logout } = useAuth();
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAuthenticated = Boolean(token);

  return (
    <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-medium">SpeechCoach</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            {[['#produit', 'Ce que vous obtenez'], ['#process', 'Comment ca marche'], ['/public-feedback', 'Avis']].map(
              ([href, label]) => (
                <Link key={label} href={href} className="transition-colors hover:text-foreground">
                  {label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-2.5" suppressHydrationWarning>
            {isMounted && (
              <>
                {isAuthenticated ? (
                  <>
                    <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground lg:block">
                      {user?.email}
                    </span>
                    <Link
                      href="/dashboard"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden sm:inline-flex')}
                    >
                      <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Se deconnecter">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}
                    >
                      Connexion
                    </Link>
                    <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                      Creer un compte
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto grid w-full max-w-7xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">

          {/* Left: copy */}
          <motion.div {...fadeUp(0)} className="max-w-xl">
            <Badge variant="secondary" className="mb-7 gap-1.5 bg-primary/10 px-3.5 py-1.5 text-primary">
              <Sparkles className="h-3 w-3" />
              Studio de coaching oral
            </Badge>

            <h1 className="font-display text-5xl font-medium leading-[1.05] sm:text-6xl lg:text-[4.25rem]">
              Transformez une prise de parole brute en{' '}
              <em className="not-italic text-primary">lecture de performance</em> vraiment utile.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              SpeechCoach transforme une video de prise de parole en retour clair,
              priorites de travail et plan de progression partageable.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={isMounted && isAuthenticated ? '/studio' : '/register'}
                className={cn(buttonVariants({ size: 'lg' }), 'px-6')}
              >
                {isMounted && isAuthenticated ? 'Nouvelle analyse' : 'Commencer'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="#produit"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-6')}
              >
                Voir le resultat
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ['Retour clair', 'Resume, preuves, plan'],
                ['Studio guide', 'Capture, traitement, export'],
                ['Fait pour partager', 'PDF, Markdown, historique'],
              ].map(([title, sub]) => (
                <div key={title} className="rounded-2xl border border-border/60 bg-card/70 px-4 py-4">
                  <div className="text-sm font-medium">{title}</div>
                  <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{sub}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: preview card */}
          <motion.div {...fadeUp(0.1)} className="relative">
            {/* Soft ambient glows */}
            <div className="pointer-events-none absolute -left-12 -top-8 h-40 w-40 rounded-full bg-accent/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

            <Card className="editorial-hero relative overflow-hidden rounded-3xl border-border/60">
              <CardHeader className="border-b border-border/60 bg-background/50 px-7 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-4 bg-accent text-accent-foreground">
                      Apercu
                    </Badge>
                    <CardTitle className="font-display max-w-xs text-2xl font-medium leading-snug">
                      Une prise de parole, un rapport clair, une prochaine action.
                    </CardTitle>
                  </div>
                  <ShieldCheck className="hidden h-7 w-7 shrink-0 text-primary sm:block" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-7">
                <div className="studio-stage relative overflow-hidden rounded-2xl p-6">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-white/45">
                    <span>Session prete</span>
                    <span>Vue synthese</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      ['Vue studio', 'Capture guidee', "Verification, permissions, retour d'etat."],
                      ['Vue rapport', 'Lecture rapide', 'Resume executif, export Markdown et PDF.'],
                    ].map(([label, title, desc]) => (
                      <div key={label} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                        <div className="text-[10px] font-medium uppercase tracking-widest text-white/45">
                          {label}
                        </div>
                        <div className="mt-2 text-lg font-medium text-white">{title}</div>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/65">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[['84', 'Score global'], ['145', 'Mots / min'], ['3', 'Actions']].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="font-mono text-2xl font-medium text-foreground">{value}</div>
                      <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* ── Product preview ────────────────────────────────────────────── */}
        <section id="produit" className="border-y border-border/60 bg-card/20 py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUpInView(0)} className="max-w-xl">
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                Ce que vous obtenez
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-snug">
                Une experience coherente du studio jusqu'au rapport.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Le produit garde la meme logique de lecture partout : comprendre vite,
                voir les preuves utiles, puis savoir quoi faire ensuite.
              </p>
            </motion.div>

            <div className="mt-14">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* ── Capabilities ───────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUpInView(0)} className="mb-14 max-w-xl">
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                Ce que le systeme analyse
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-snug">
                Trois axes d'analyse,{' '}
                <em className="not-italic text-primary">un seul rapport.</em>
              </h2>
            </motion.div>

            <div className="grid gap-5 lg:grid-cols-3">
              {capabilities.map((item, i) => (
                <motion.div key={item.title} {...fadeUpInView(i * 0.07)}>
                  <Card className="h-full rounded-2xl border-border/60 bg-card/70">
                    <CardHeader className="px-7 pt-7">
                      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="font-display text-2xl font-medium">{item.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5 px-7 pb-7">
                      {item.points.map((point) => (
                        <div
                          key={point}
                          className="flex items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3 text-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {point}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Workflow ────────────────────────────────────────────────────── */}
        <section id="process" className="border-y border-border/60 bg-card/20 py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:px-8">

            {/* Left */}
            <motion.div {...fadeUpInView(0)}>
              <Badge variant="secondary" className="mb-4 bg-accent text-accent-foreground">
                Comment ca marche
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-snug">
                Chaque etape prepare <em className="not-italic text-primary">la suivante.</em>
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                De la capture au rapport, le parcours reste lisible : on sait quoi faire,
                ce qui est en cours et ce qu'il faut corriger ensuite.
              </p>

              <div className="mt-9 rounded-2xl border border-border/60 bg-card/70 p-6">
                <div className="mb-4 text-sm font-medium">Concu pour</div>
                <div className="space-y-2.5">
                  {audiences.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3 text-sm"
                    >
                      <BarChart3 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right: steps */}
            <div className="space-y-4">
              {workflow.map((step, i) => (
                <motion.div key={step.title} {...fadeUpInView(i * 0.08)}>
                  <Card className="rounded-2xl border-border/60 bg-card/70">
                    <CardContent className="flex gap-5 p-6">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-base font-medium text-primary">
                        0{i + 1}
                      </div>
                      <div>
                        <div className="font-display text-xl font-medium">{step.title}</div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUpInView(0)}>
              <Card className="data-ribbon overflow-hidden rounded-3xl border-0">
                <CardContent className="grid gap-10 p-10 lg:grid-cols-[1fr_auto] lg:p-14">
                  <div>
                    <Badge
                      variant="secondary"
                      className="mb-5 bg-white/15 text-primary-foreground hover:bg-white/20"
                    >
                      Pret a tester
                    </Badge>
                    <h2 className="font-display max-w-xl text-4xl font-medium leading-snug text-primary-foreground lg:text-5xl">
                      D'une video brute a un plan de progression <em>exploitable.</em>
                    </h2>
                    <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/75">
                      Ouvrez le studio, chargez une video ou enregistrez-vous, puis retrouvez
                      un rapport clair avec score, preuves et prochaines actions.
                    </p>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    <Link
                      href={isAuthenticated ? '/studio' : '/register'}
                      className={cn(
                        buttonVariants({ size: 'lg' }),
                        'bg-background px-7 text-foreground hover:bg-background/90'
                      )}
                    >
                      {isAuthenticated ? 'Aller au studio' : 'Creer un compte'}
                    </Link>
                    <Link
                      href="/public-feedback"
                      className={cn(
                        buttonVariants({ variant: 'ghost', size: 'lg' }),
                        'border border-white/20 px-7 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground'
                      )}
                    >
                      Lire les avis
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-lg font-medium">SpeechCoach</div>
                <div className="text-xs text-muted-foreground">Professional speech feedback</div>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Une application de coaching oral qui privilegie la clarte, la coherence
              et des livrables partageables.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
            <Link href="/public-feedback" className="transition-colors hover:text-foreground">
              Avis utilisateurs
            </Link>
            <Link
              href={isMounted && isAuthenticated ? '/dashboard' : '/login'}
              className="transition-colors hover:text-foreground"
            >
              {isMounted && isAuthenticated ? 'Dashboard' : 'Connexion'}
            </Link>
            <span className="text-muted-foreground/60">SpeechCoach 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
