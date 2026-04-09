'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mic, Target, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/auth-context';

/* ─── Schema ─────────────────────────────────────────────────────────── */

const registerSchema = z
  .object({
    email:           z.string().email('Email invalide'),
    password:        z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/* ─── Data ───────────────────────────────────────────────────────────── */

const benefits = [
  { icon: Video,        text: 'Analysez une vidéo importée ou capturée en direct.' },
  { icon: Target,       text: 'Recevez des axes de progression clairs et actionnables.' },
  { icon: CheckCircle2, text: 'Exportez un rapport propre pour partage académique ou professionnel.' },
];

/* ─── Animation preset ───────────────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
});

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { label: 'Vide', color: 'bg-border', width: '0%' };
  if (score <= 1) return { label: 'Faible', color: 'bg-destructive', width: '33%' };
  if (score <= 3) return { label: 'Moyen', color: 'bg-amber-500', width: '66%' };
  return { label: 'Fort', color: 'bg-emerald-500', width: '100%' };
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const watchedPassword = form.watch('password');
  const strength = passwordStrength(watchedPassword);

  async function onSubmit(data: RegisterFormValues) {
    setIsSubmitting(true);
    try {
      await authService.register({ email: data.email, password: data.password });

      const params = new URLSearchParams();
      params.append('username', data.email);
      params.append('password', data.password);

      const { access_token } = await authService.login(params);
      localStorage.setItem('token', access_token);
      login(access_token, { id: 'temp-session', email: data.email });
      toast.success('Compte créé avec succès.');
    } catch (error: unknown) {
      console.error(error);
      localStorage.removeItem('token');
      const detail =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      toast.error(detail ?? "Une erreur s'est produite pendant l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1fr_1fr]">

        {/* ── Left: form ────────────────────────────────────────────── */}
        <motion.section {...fadeUp(0)} className="flex items-center">
          <Card className="w-full">
            <CardHeader className="px-7 pt-7">
              <Link href="/" className="mb-5 inline-flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Mic className="h-4 w-4" />
                </div>
                <span className="font-display text-base font-medium">SpeechCoach</span>
              </Link>
              <CardTitle>Créer un compte</CardTitle>
              <CardDescription className="mt-1.5">
                Configurez votre espace de pratique et commencez à produire des rapports plus nets.
              </CardDescription>
            </CardHeader>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5 px-7 py-6">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    autoComplete="email"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={form.formState.errors.email ? 'register-email-error' : undefined}
                    {...form.register('email')}
                    className={form.formState.errors.email ? 'border-destructive' : ''}
                  />
                  {form.formState.errors.email && (
                    <p id="register-email-error" className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="relative space-y-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={form.formState.errors.password ? 'register-password-error' : undefined}
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
                    <p id="register-password-error" className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                  <div className="space-y-1.5 pt-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className={`${strength.color} h-full transition-all`} style={{ width: strength.width }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solidité du mot de passe : {strength.label}
                    </p>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="relative space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                    aria-describedby={form.formState.errors.confirmPassword ? 'register-confirm-error' : undefined}
                    {...form.register('confirmPassword')}
                    className={form.formState.errors.confirmPassword ? 'border-destructive pr-12' : 'pr-12'}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-[29px] flex h-10 items-center px-3 text-muted-foreground"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {form.formState.errors.confirmPassword && (
                    <p id="register-confirm-error" className="text-xs text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 border-none bg-transparent px-7 pb-7">
                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours…
                    </>
                  ) : (
                    <>
                      S'inscrire
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Vous avez déjà un compte ?{' '}
                  <Link
                    href="/login"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.section>

        {/* ── Right: feature panel ──────────────────────────────────── */}
        <motion.section
          {...fadeUp(0.06)}
          className="hidden flex-col justify-between gap-10 rounded-3xl border border-border/60 bg-card p-10 lg:flex"
        >
          {/* Hero copy */}
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-medium leading-snug text-foreground">
              Construisez un espace de coaching qui{' '}
              <em className="not-italic text-primary">vous ressemble.</em>
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
              Votre profil, vos objectifs et vos vidéos de pratique seront le socle
              d'un suivi de progression sur mesure.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2.5">
            {benefits.map((item) => (
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

      </div>
    </div>
  );
}
