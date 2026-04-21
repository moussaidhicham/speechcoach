'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic, ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HighlightItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface AuthShellProps {
  badge?: string;
  title: string;
  subtitle: string;
  highlights: HighlightItem[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthShell({
  badge,
  title,
  subtitle,
  highlights,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(28,100,242,0.10),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),hsl(var(--background))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:36px_36px] opacity-30" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'grid w-full overflow-hidden rounded-[28px] border border-border/60 bg-background/88 shadow-[0_30px_90px_-32px_rgba(15,23,42,0.35)] backdrop-blur xl:grid-cols-[0.95fr_1.05fr]',
            className,
          )}
        >
          <aside className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-r border-border/60 bg-[linear-gradient(160deg,rgba(28,100,242,0.10),rgba(255,255,255,0)_48%)] p-7 xl:flex">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold tracking-tight text-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <Mic className="h-5 w-5" />
                  </span>
                  SpeechCoach
                </Link>
                <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour
                </Link>
              </div>

              <div className="max-w-md space-y-4">
                {badge ? (
                  <Badge variant="secondary" className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {badge}
                  </Badge>
                ) : null}
                <div className="space-y-3">
                  <h1 className="max-w-lg text-[2.5rem] font-semibold leading-tight tracking-tight text-foreground">
                    {title}
                  </h1>
                  <p className="max-w-md text-[15px] leading-7 text-muted-foreground">
                    {subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * index, duration: 0.35 }}
                  className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background/70 p-3.5"
                >
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}

              {footer ? <div className="pt-2">{footer}</div> : null}
            </div>
          </aside>

          <section className="flex min-h-[620px] flex-col justify-center px-5 py-5 sm:px-7 sm:py-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between xl:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Mic className="h-4.5 w-4.5" />
                </span>
                SpeechCoach
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour
              </Link>
            </div>
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
              {children}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
