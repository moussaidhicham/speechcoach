'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/auth-context';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const highlights = [
  {
    icon: Video,
    title: 'Reprendre vos analyses',
    description: 'Retrouvez rapidement vos sessions, rapports et exercices prioritaires.',
  },
  {
    icon: Sparkles,
    title: 'Un coaching plus lisible',
    description: 'Les retours restent courts, priorises et faciles a appliquer des la prochaine prise.',
  },
  {
    icon: ShieldCheck,
    title: 'Un espace de travail stable',
    description: 'Votre suivi reste centralise pour les usages academiques comme professionnels.',
  },
];

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginClient />
    </React.Suspense>
  );
}

function LoginClient() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isUnverified, setIsUnverified] = React.useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = React.useState('');
  const [isResending, setIsResending] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      form.setValue('email', email);
    }
    if (searchParams.get('verified') === 'true') {
      toast.success('Votre email a ete verifie.');
    }
  }, [searchParams, form]);

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    setIsUnverified(false);
    try {
      const params = new URLSearchParams();
      params.append('username', data.email);
      params.append('password', data.password);

      const { access_token } = await authService.login(params);
      localStorage.setItem('token', access_token);

      const userStatus = await authService.getStatus();
      if (!userStatus.is_verified) {
        setIsUnverified(true);
        setUnverifiedEmail(data.email);
        localStorage.removeItem('token');
        toast.error('Veuillez verifier votre email.');
        return;
      }

      login(access_token, { id: userStatus.id, email: userStatus.email });
      toast.success('Connexion reussie.');
    } catch (error: any) {
      localStorage.removeItem('token');
      const detail = error.response?.data?.detail;
      toast.error(detail === 'LOGIN_BAD_CREDENTIALS' ? 'Email ou mot de passe incorrect.' : 'Erreur de connexion.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendEmail() {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      await authService.requestVerification(unverifiedEmail);
      toast.success('Email de verification renvoye.');
    } catch {
      toast.error("Impossible de renvoyer l'email.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      badge="Connexion"
      title="Reprenez votre progression sans perdre de temps."
      subtitle="Connectez-vous pour retrouver vos analyses, vos priorites de travail et votre historique de progression dans un espace plus simple a relire."
      highlights={highlights}
      footer={
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Session apres session, l'espace reste centre sur ce qui compte vraiment : un diagnostic clair, une priorite nette et un plan d'action simple.
        </div>
      }
    >
      {!isUnverified ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Bon retour</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Se connecter</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Entrez vos identifiants pour revenir directement sur votre tableau de bord.
            </p>
          </div>

          {searchParams.get('verified') === 'true' ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Votre compte est bien verifie. Vous pouvez maintenant vous connecter.</p>
            </div>
          ) : null}

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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Mot de passe oublie ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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
              {form.formState.errors.password ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4 text-sm leading-6 text-muted-foreground">
              Vous retrouvez vos rapports, vos parametres et vos preferences d'analyse sans reconfigurer votre espace.
            </div>

            <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/15">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Creer un compte
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-amber-500/10 text-amber-600">
            <Mail className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Verification requise</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              L'adresse <span className="font-semibold text-foreground">{unverifiedEmail}</span> doit etre confirmee avant la connexion.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4 text-left text-sm leading-6 text-muted-foreground">
            Ouvrez l'email de verification, puis revenez ici. Si besoin, vous pouvez en renvoyer un nouveau.
          </div>

          <div className="space-y-3">
            <Button onClick={handleResendEmail} disabled={isResending} className="h-12 w-full rounded-2xl text-base font-semibold">
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Renvoyer l’email'
              )}
            </Button>
            <Button variant="ghost" className="h-11 w-full rounded-2xl" onClick={() => setIsUnverified(false)}>
              Utiliser un autre compte
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
