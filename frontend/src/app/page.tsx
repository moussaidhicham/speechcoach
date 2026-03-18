'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Mic, Video, BarChart3, ArrowRight, CheckCircle2, 
  Play, LayoutDashboard, LogOut, Sparkles, Zap, Target
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export default function LandingPage() {
  const { user, logout, token } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Use mounted state to handle hydration-sensitive logic
  useEffect(() => {
    setMounted(true);
  }, []);

  // For parts that depend on auth/token, we use the mounted check 
  // to ensure server-client consistency on the first pass
  const isAuthenticated = mounted && !!token;

  return (
    <div className="flex flex-col min-h-screen bg-background" suppressHydrationWarning>
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b" suppressHydrationWarning>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">SpeechCoach</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="hover:text-primary transition-colors">Fonctionnalités</Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">Comment ça marche</Link>
            {!isAuthenticated ? (
              <Link href="/login" className="hover:text-primary transition-colors">Connexion</Link>
            ) : (
              <Link href="/dashboard" className="hover:text-primary transition-colors font-bold text-primary">Dashboard</Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link 
                  href="/login" 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:flex")}
                >
                  Connexion
                </Link>
                <Link 
                  href="/register" 
                  className={buttonVariants({ size: "sm" })}
                >
                  S'inscrire
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden lg:inline-block max-w-[150px] truncate">{user?.email}</span>
                <Link 
                  href="/dashboard" 
                  className={buttonVariants({ size: "sm" })}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Mon Dashboard
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-400/10 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 py-1 px-4 text-xs tracking-wider uppercase font-semibold border-primary/20 bg-primary/5 text-primary">
                <Zap className="w-3 h-3 mr-2" /> Propulsé par l'IA de pointe
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Maîtrisez votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Expression Orale</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Obtenez un retour pédagogique instantané sur votre posture, votre regard et votre débit vocal grâce à notre coach intelligent.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href={isAuthenticated ? "/dashboard" : "/register"} 
                className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-md font-semibold group shadow-lg shadow-primary/20")}
              >
                {isAuthenticated ? "Retour au Dashboard" : "Commencer l'analyse"} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#how-it-works" 
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-8 text-md font-semibold")}
              >
                Comment ça marche ?
              </Link>
            </div>
            
            <div className="mt-16 relative mx-auto max-w-5xl rounded-3xl border bg-card/50 backdrop-blur-sm p-4 shadow-2xl shadow-primary/10 group">
                <div className="aspect-video rounded-2xl bg-muted overflow-hidden relative border shadow-inner flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1475721027187-402ad2989a3b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000" />
                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-primary shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                            <Play className="w-8 h-8 text-white fill-current translate-x-1" />
                        </div>
                        <p className="text-sm font-bold text-primary uppercase tracking-widest bg-white/80 backdrop-blur px-4 py-1 rounded-full">Voir la démo</p>
                    </div>
                </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-4" suppressHydrationWarning>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Analyse Multi-Dimensionnelle
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Notre moteur IA traite simultanément la vidéo et l'audio pour un diagnostic à 360°.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" suppressHydrationWarning>
            {[
              {
                title: "Analyse Vocale",
                desc: "Mesure du débit (WPM), des pauses silencieuses, des hésitations et de l'énergie de projection.",
                icon: <Mic className="w-6 h-6" />,
                color: "bg-blue-500",
                features: ["Rythme de parole", "Clarté sonore", "Mots de remplissage"]
              },
              {
                title: "Intelligence Visuelle",
                desc: "Analyse du contact visuel, de la symétrie de la posture et de l'amplitude des gestes.",
                icon: <Video className="w-6 h-6" />,
                color: "bg-purple-500",
                features: ["Eye-tracking", "Posture de confiance", "Langage corporel"]
              },
              {
                title: "Feedback Actionnable",
                desc: "Conseils personnalisés générés par LLM pour corriger vos points faibles spécifiques.",
                icon: <Target className="w-6 h-6" />,
                color: "bg-amber-500",
                features: ["Objectifs sur mesure", "Exercices recommandés", "Suivi de progression"]
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-card h-full group overflow-hidden">
                  <div className={`h-1 w-full ${feature.color}`} />
                  <CardContent className="pt-8 pb-8">
                    <div className={`${feature.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-${feature.color.split('-')[1]}/20 group-hover:scale-110 transition-transform`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                      {feature.desc}
                    </p>
                    <ul className="space-y-2">
                       {feature.features.map((f, j) => (
                         <li key={j} className="flex items-center text-xs font-semibold text-foreground/70">
                           <CheckCircle2 className="w-3 h-3 mr-2 text-primary" /> {f}
                         </li>
                       ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-background overflow-hidden" suppressHydrationWarning>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <h2 className="text-4xl font-extrabold tracking-tight">Devenez un orateur <br/><span className="text-primary italic underline decoration-primary/20">Inspirant</span></h2>
              
              <div className="space-y-8" suppressHydrationWarning>
                {[
                  { step: "01", title: "Enregistrement ou Upload", desc: "Utilisez notre studio HD intégré ou importez une vidéo existante (MP4, MKV)." },
                  { step: "02", title: "Traitement Hybride IA", desc: "Nos modèles Vision (MediaPipe) et Audio (Whisper) extraient chaque micro-signal." },
                  { step: "03", title: "Rapport de Coaching", desc: "Obtenez un score global, des graphiques temporels et un plan d'amélioration." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center text-lg font-black text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <Link 
                  href={isAuthenticated ? "/dashboard" : "/register"}
                  className={cn(buttonVariants({ size: "lg" }), "rounded-full px-10 shadow-2xl shadow-primary/20 font-bold")}
                >
                  Démarrer l'expérience <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
            
            <div className="flex-1 relative">
                <div className="absolute -top-10 -right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl shadow-primary/20" />
                <div className="bg-muted aspect-square rounded-[2rem] border shadow-2xl relative overflow-hidden group p-1">
                   <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                    <div className="bg-card h-full rounded-[1.8rem] flex flex-col justify-center p-12 space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Neural Analysis</span>
                                <span className="text-[10px] font-mono text-primary animate-pulse">LIVE_FEED...</span>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-primary" 
                                    initial={{ width: "0%" }}
                                    whileInView={{ width: "85%" }}
                                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-muted/50 border space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Posture</p>
                                <p className="text-lg font-black text-primary">Stable</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-muted/50 border space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Débit</p>
                                <p className="text-lg font-black text-emerald-500">145<span className="text-[10px] font-normal ml-1">wpm</span></p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                                <span className="text-xs font-bold">Feedback IA Génératif...</span>
                            </div>
                            <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y bg-muted/20 relative" suppressHydrationWarning>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" suppressHydrationWarning>
            <div suppressHydrationWarning>
              <div className="text-4xl font-black text-primary mb-2">95%</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Apprentissage Accéléré</p>
            </div>
            <div suppressHydrationWarning>
              <div className="text-4xl font-black text-primary mb-2">8ms</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Latence Analyse</p>
            </div>
            <div suppressHydrationWarning>
              <div className="text-4xl font-black text-primary mb-2">3k+</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Utilisateurs</p>
            </div>
            <div suppressHydrationWarning>
              <div className="text-4xl font-black text-primary mb-2">100%</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confidentialité</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-muted/10 border-t" suppressHydrationWarning>
        <div className="container mx-auto px-4" suppressHydrationWarning>
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-1 rounded-lg">
                  <Mic className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">SpeechCoach</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Le compagnon ultime pour perfectionner vos prises de parole en public grâce à l'intelligence artificielle.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-16">
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest">Produit</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="#features" className="hover:text-primary transition-colors">Fonctionnalités</Link></li>
                  <li><Link href="#how-it-works" className="hover:text-primary transition-colors">Méthodologie</Link></li>
                  <li><Link href="/studio" className="hover:text-primary transition-colors">Studio</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest">Légal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="#" className="hover:text-primary transition-colors">Confidentialité</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Conditions</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Support</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-medium">
            <p>© 2026 SpeechCoach. Projet de Fin d'Études Master ENS Meknès.</p>
            <div className="flex gap-4">
                <span>Made with ❤️ for Speakers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
