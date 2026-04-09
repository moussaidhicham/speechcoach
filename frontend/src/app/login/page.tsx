'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, Mic, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/auth-context';

/* ─── Schema ─────────────────────────────────────────────────────────── */

const loginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ─── Data ───────────────────────────────────────────────────────────── */

const highlights = [
  { icon: Video,      text: 'Studio vidéo optimisé pour webcam et mobile.' },
  { icon: Sparkles,   text: 'Coaching clair, structuré et priorisé.' },
  { icon: ShieldCheck, text: 'Rapports partageables pour contexte académique et pro.' },
];

/* ─── Animation preset ───────────────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
});

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const params = new URLSearchParams();
      params.append('username', data.email);
      params.append('password', data.password);

      const { access_token } = await authService.login(params);
      localStorage.setItem('token', access_token);
      login(access_token, { id: 'temp-session', email: data.email });
      toast.success('Bon retour parmi nous.');
    } catch (error: unknown) {
      console.error(error);
      localStorage.removeItem('token');
      toast.error('Identifiants invalides ou erreur serveur.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">

        {/* ── Left panel ────────────────────────────────────────────── */}
        <motion.section
          {...fadeUp(0)}
          className="hidden flex-col justify-between gap-10 rounded-3xl border border-border/60 bg-card p-10 lg:flex"
        >
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-lg font-medium">SpeechCoach</div>
              <div className="text-xs text-muted-foreground">Coaching vidéo et oralité structurée</div>
            </div>
          </Link>

          {/* Hero copy */}
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-medium leading-snug text-foreground">
              Revenez dans votre espace de pratique avec une interface{' '}
              <em className="not-italic text-primary">plus claire.</em>
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
              Analysez vos prises de parole, retrouvez vos rapports et poursuivez
              votre progression sans friction.
            </p>
          </div>

          {/* Highlights */}
          <div className="space-y-2.5">
            {highlights.map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Right panel: form ──────────────────────────────────────── */}
        <motion.section {...fadeUp(0.06)} className="flex items-center">
          <Card className="w-full">
            <CardHeader className="px-7 pt-7">
              {/* Mobile-only logo */}
              <Link href="/" className="mb-5 inline-flex items-center gap-3 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Mic className="h-4 w-4" />
                </div>
                <span className="font-display text-base font-medium">SpeechCoach</span>
              </Link>

              <CardTitle>Connexion</CardTitle>
              <CardDescription className="mt-1.5">
                Accédez à vos analyses, vos rapports et vos objectifs de progression.
              </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5 px-7 py-6">
                {/* Email */}
                <div className="relative space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    autoComplete="email"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={form.formState.errors.email ? 'login-email-error' : undefined}
                    {...form.register('email')}
                    className={form.formState.errors.email ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.email && (
                    <p id="login-email-error" className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password">Mot de passe</Label>
                    <span className="text-xs text-muted-foreground/70">
                      Besoin d'aide ? Passez par les paramètres.
                    </span>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={form.formState.errors.password ? 'login-password-error' : undefined}
                    {...form.register('password')}
                    className={form.formState.errors.password ? 'border-destructive pr-12' : 'pr-12'}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-[29px] flex h-10 items-center px-3 text-muted-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {form.formState.errors.password && (
                    <p id="login-password-error" className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 border-none bg-transparent px-7 pb-7">
                <Button className="w-full" type="submit" size="default" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours…
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Nouveau ici ?{' '}
                  <Link
                    href="/register"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Créer un compte
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.section>

      </div>
    </div>
  );
}
