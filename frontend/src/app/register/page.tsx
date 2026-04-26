'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2, Eye, EyeOff, Loader2, Mail, Sparkles, Target, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';

const registerSchema = z
  .object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, '8 caracteres minimum'),
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const highlights = [
  {
    icon: Video,
    title: 'Commencer vite',
    description: "Importez ou enregistrez une prise de parole sans changer d'outil.",
  },
  {
    icon: Target,
    title: 'Des priorites nettes',
    description: 'Chaque session fait ressortir le point a corriger en premier.',
  },
  {
    icon: Sparkles,
    title: 'Un parcours plus clair',
    description: 'Le compte garde vos preferences, votre niveau et votre objectif de travail.',
  },
];

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { label: 'Vide', color: 'bg-border', width: '0%' };
  if (score <= 1) return { label: 'Faible', color: 'bg-destructive', width: '30%' };
  if (score <= 3) return { label: 'Moyen', color: 'bg-amber-500', width: '68%' };
  return { label: 'Fort', color: 'bg-emerald-500', width: '100%' };
}

function passwordRequirements(password: string) {
  return [
    { label: '8 caracteres minimum', met: password.length >= 8 },
    { label: 'Majuscule et minuscule', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Au moins un chiffre', met: /\d/.test(password) },
    { label: 'Un caractere special', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [registeredEmail, setRegisteredEmail] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const watchedPassword = form.watch('password');
  const watchedConfirm = form.watch('confirmPassword');
  const strength = passwordStrength(watchedPassword);
  const requirements = passwordRequirements(watchedPassword);
  const hasTypedConfirm = watchedConfirm.length > 0;
  const isMatching = watchedPassword && watchedConfirm && watchedPassword === watchedConfirm;
  const showPasswordGuidance = watchedPassword.length > 0;

  async function onSubmit(data: RegisterFormValues) {
    setIsSubmitting(true);
    try {
      await authService.register({ email: data.email, password: data.password });
      setRegisteredEmail(data.email);
      setIsSuccess(true);
      toast.success('Compte cree avec succes.');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Une erreur s'est produite pendant l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="Creation de compte"
      title="Installez un espace de travail simple des le debut."
      subtitle="Creez votre compte en moins d'une minute pour conserver vos analyses, vos reglages et votre progression au meme endroit."
      highlights={highlights}
      footer={
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Vous pourrez ensuite definir votre niveau, votre objectif et vos preferences pendant l'onboarding.
        </div>
      }
    >
      {!isSuccess ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Nouvel espace</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Creer un compte</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Commencez avec un compte leger, puis personnalisez vos analyses pendant l'onboarding.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  placeholder="nom@exemple.com"
                  className="h-11 rounded-2xl border-border/60 bg-background/60 pl-10"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  className="h-11 rounded-2xl border-border/60 bg-background/60 pr-10"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {showPasswordGuidance ? (
                <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Solidite</span>
                    <span className="font-semibold text-foreground">{strength.label}</span>
                  </div>
                  <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                    <motion.div initial={{ width: 0 }} animate={{ width: strength.width }} className={cn('h-full transition-colors duration-500', strength.color)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {requirements.map((requirement) => (
                      <div key={requirement.label} className="flex items-center gap-2 text-xs">
                        <div
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full border',
                            requirement.met ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground/40',
                          )}
                        >
                          {requirement.met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                        </div>
                        <span className={cn(requirement.met ? 'text-foreground' : 'text-muted-foreground')}>{requirement.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  Utilisez au moins 8 caracteres avec une majuscule, un chiffre et un caractere special.
                </p>
              )}

              {form.formState.errors.password ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirmPassword">Confirmation</Label>
                <AnimatePresence>
                  {hasTypedConfirm ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        isMatching ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {isMatching ? 'Correspond' : 'A verifier'}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="********"
                  className={cn('h-11 rounded-2xl border-border/60 bg-background/60 pr-10', hasTypedConfirm && !isMatching ? 'border-destructive/50' : '')}
                  {...form.register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>

            <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/15">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creation...
                </>
              ) : (
                <>
                  Creer mon compte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Deja un compte ?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Compte cree</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Un email de verification a ete envoye a <span className="font-semibold text-foreground">{registeredEmail}</span>.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4 text-left text-sm leading-6 text-muted-foreground">
            Verifiez votre boite de reception, puis revenez vous connecter une fois l'email confirme.
          </div>

          <div className="space-y-3">
            <Link
              href={`/login?email=${encodeURIComponent(registeredEmail)}`}
              className={cn(buttonVariants({ variant: 'default' }), 'h-12 w-full rounded-2xl text-base font-semibold')}
            >
              Aller a la connexion
            </Link>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 w-full rounded-2xl')}
            >
              Retour a l'accueil
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
