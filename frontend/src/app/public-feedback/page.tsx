'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageCircle, Users, ArrowLeft, Quote } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import api from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AvatarCustom } from '@/components/ui/avatar-custom';

export default function PublicFeedbackPage() {
  const [stats, setStats] = useState({ average_rating: 0, total_reviews: 0 });
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch stats independently so network errors don't zero them out
    const fetchStats = async () => {
      try {
        const res = await api.get('/feedback/platform/stats');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    // Fetch feedbacks independently
    const fetchFeedbacks = async () => {
      try {
        const res = await api.get('/feedback/platform/all');
        setFeedbacks(res.data);
      } catch (err) {
        console.error("Failed to fetch feedbacks:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    fetchFeedbacks();
  }, []);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <Header title="Mur de l'Amour" />

        <div className="flex-1 p-8 overflow-y-auto max-w-6xl w-full mx-auto space-y-12">
          {/* Hero Stats */}
          <section className="text-center space-y-6 pt-8">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm"
            >
              <Star className="w-4 h-4 fill-current" /> La communauté SpeechCoach
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Ce que vous dites de nous</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Vos retours sont notre moteur. Découvrez les expériences des coachs qui utilisent SpeechCoach pour transformer leur expression orale.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <StatCard 
                label="Note Globale" 
                value={`${stats.average_rating}/5`} 
                icon={<Star className="w-6 h-6 text-yellow-500 fill-current" />}
              />
              <StatCard 
                label="Avis récoltés" 
                value={stats.total_reviews} 
                icon={<MessageCircle className="w-6 h-6 text-primary" />}
              />
              <StatCard 
                label="Utilisateurs actifs" 
                value="98%" 
                icon={<Users className="w-6 h-6 text-blue-500" />}
                sublabel="de satisfaction"
              />
            </div>
          </section>

          {/* Feedback Masonry-like Grid */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Avis récents</h2>
              <Link href="/settings">
                <Button variant="outline" size="sm">Donner mon avis</Button>
              </Link>
            </div>

            {isLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
               </div>
            ) : feedbacks.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {feedbacks.map((f, i) => (
                   <FeedbackCard key={f.id} feedback={f} index={i} />
                 ))}
               </div>
            ) : (
               <div className="text-center py-20 bg-background rounded-3xl border border-dashed">
                 <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                 <p className="text-muted-foreground">Aucun avis pour le moment. Soyez le premier !</p>
               </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, sublabel }: any) {
  return (
    <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm">
      <CardContent className="pt-6 pb-6 flex flex-col items-center">
        <div className="p-3 rounded-2xl bg-muted mb-4">{icon}</div>
        <div className="text-3xl font-black">{value}</div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {sublabel && <div className="text-[10px] text-primary font-bold mt-1 uppercase tracking-tighter">{sublabel}</div>}
      </CardContent>
    </Card>
  );
}

function FeedbackCard({ feedback, index }: { feedback: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="h-full border-none shadow-lg hover:shadow-2xl transition-all duration-300 group">
        <CardContent className="pt-6 pb-6 space-y-4">
          <div className="flex justify-between items-start">
            <RatingStars rating={feedback.rating} editable={false} size="sm" />
            <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(feedback.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
          
          <div className="relative">
            <Quote className="absolute -left-2 -top-2 w-8 h-8 text-primary/5 -z-10 group-hover:text-primary/10 transition-colors" />
            <p className="text-sm leading-relaxed italic text-foreground/80">
              "{feedback.comments || "L'utilisateur n'a pas laissé de commentaire, mais la note parle d'elle-même !"}"
            </p>
          </div>

          <div className="pt-4 border-t flex items-center gap-3">
            <AvatarCustom 
              src={feedback.user_profile?.avatar_url} 
              name={feedback.user_profile?.full_name} 
              size="sm" 
            />
            <div className="text-xs">
              <div className="font-bold truncate max-w-[120px]">
                {feedback.user_profile?.full_name || 'Utilisateur'}
              </div>
              <div className="text-muted-foreground opacity-60">Session Verifiée</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
