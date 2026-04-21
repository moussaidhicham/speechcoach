'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmailClient />
    </React.Suspense>
  );
}

function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification du compte en cours...');
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide ou manquant.');
      return;
    }

    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    const verify = async () => {
      try {
        const data = await authService.verifyEmail(token);

        // Success! Handle automatic login
        setStatus('success');
        setMessage('Votre email a été vérifié ! Redirection...');

        // Save token and user info directly to localStorage
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify({ id: data.user.id, email: data.user.email }));

        // Trigger auth change event to update auth context
        window.dispatchEvent(new Event('speechcoach-auth-change'));

        toast.success('Compte activé ! Bienvenue sur SpeechCoach.');

        // Redirect after a short delay so the user sees the success state
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);

      } catch (error: any) {
        setStatus('error');
        const detail = error.response?.data?.detail;
        if (detail === 'VERIFY_USER_BAD_TOKEN') {
          setMessage('Le lien a expiré ou est invalide.');
        } else if (detail === 'VERIFY_USER_ALREADY_VERIFIED') {
          setStatus('error');
          setMessage('Ce compte est déjà vérifié ou le lien n\'est plus valide.');
        } else {
          setMessage('Une erreur est survenue lors de la vérification.');
        }
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans antialiased" suppressHydrationWarning>
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -right-[5%] bottom-[5%] h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen flex-col items-center justify-center p-4">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
           className="w-full max-w-[480px]"
        >
          <div className="overflow-hidden rounded-[32px] border border-border/50 bg-card/30 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.15)] backdrop-blur-xl">
            <div className="p-8 sm:p-12 text-center">
              
              <div className="mb-8 flex justify-center">
                 {status === 'loading' && (
                    <div className="relative">
                      <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      </div>
                      <motion.div 
                        className="absolute -inset-4 rounded-full border border-dashed border-primary/20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                 )}
                 {status === 'success' && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-20 w-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner"
                    >
                      <CheckCircle2 className="h-10 w-10" />
                    </motion.div>
                 )}
                 {status === 'error' && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-20 w-20 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center shadow-inner"
                    >
                      <XCircle className="h-10 w-10" />
                    </motion.div>
                 )}
              </div>

              <div className="space-y-3 mb-10">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  {status === 'loading' ? 'Vérification...' : 
                   status === 'success' ? 'Email Validé !' : 'Oups !'}
                </h1>
                <p className="text-muted-foreground leading-relaxed px-4">
                  {message}
                </p>
              </div>

              {status === 'error' && (
                <Button 
                  onClick={() => router.push('/login')}
                  className="w-full h-12 rounded-2xl font-semibold shadow-xl shadow-primary/10 transition-all hover:shadow-primary/20 hover:-translate-y-0.5"
                >
                  Retour à la connexion
                </Button>
              )}

              {status === 'success' && (
                 <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/10">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5 }}
                    />
                 </div>
              )}
            </div>

            {status === 'loading' && (
               <div className="h-1 w-full bg-primary/5 overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
