'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Edit3, RefreshCw, Send, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RatingStars } from '@/components/ui/rating-stars';
import api from '@/lib/api';

interface FeedbackFormProps {
  onSubmitted?: () => void;
  existingFeedback?: {
    id:       string;
    rating:   number;
    comments: string | null;
  } | null;
}

const ratingLabel: Record<number, string> = {
  1: 'Très déçu',
  2: 'Déçu',
  3: 'Moyen',
  4: 'Bien',
  5: 'Excellent',
};

export function FeedbackForm({ onSubmitted, existingFeedback }: FeedbackFormProps) {
  const [rating,      setRating]      = useState(existingFeedback?.rating   || 0);
  const [comments,    setComments]    = useState(existingFeedback?.comments  || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  useEffect(() => {
    setRating(existingFeedback?.rating   || 0);
    setComments(existingFeedback?.comments || '');
    setSubmitted(false);
  }, [existingFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Veuillez sélectionner une note.'); return; }
    setIsSubmitting(true);
    try {
      if (existingFeedback) {
        await api.patch(`/feedback/platform/${existingFeedback.id}`, {
          rating, comments: comments.trim() || null,
        });
        toast.success('Votre avis a été mis à jour.');
      } else {
        await api.post('/feedback/platform', {
          rating, comments: comments.trim() || null,
        });
        toast.success('Merci pour votre retour.');
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement du feedback.");
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!existingFeedback) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre avis ?')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/feedback/platform/${existingFeedback.id}`);
      toast.success('Votre avis a été supprimé.');
      setRating(0); setComments(''); setSubmitted(false);
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression.');
    } finally { setIsDeleting(false); }
  };

  /* ── Success state ────────────────────────────────────────────── */
  if (submitted && !existingFeedback) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="font-display text-xl font-medium">Merci !</CardTitle>
            <CardDescription className="mt-2 max-w-xs text-sm leading-relaxed">
              Votre avis a bien été enregistré. Il nous aide à améliorer SpeechCoach chaque jour.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
            Envoyer un autre avis
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Form ─────────────────────────────────────────────────────── */
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>
              {existingFeedback ? 'Modifier mon avis' : 'Votre avis compte'}
            </CardTitle>
            <CardDescription className="mt-1.5 leading-relaxed">
              {existingFeedback
                ? 'Vous pouvez mettre à jour votre note et vos commentaires ci-dessous.'
                : "Comment trouvez-vous votre expérience sur SpeechCoach ? Partagez vos idées d'amélioration."}
            </CardDescription>
          </div>
          {existingFeedback && (
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Supprimer mon avis"
            >
              {isDeleting
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Trash2    className="h-3.5 w-3.5" />
              }
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-7 pb-7">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Rating block */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-secondary/30 py-6">
            <Label className="text-sm text-muted-foreground">Note globale</Label>
            <RatingStars rating={rating} onRatingChange={setRating} size="lg" />
            <span className="h-5 text-sm font-medium text-foreground">
              {ratingLabel[rating] ?? ''}
            </span>
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback-comments">Commentaires (optionnel)</Label>
            <textarea
              id="feedback-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Qu'est-ce qu'on peut améliorer ? Qu'est-ce que vous aimez le plus ?"
              rows={4}
              className={[
                'w-full resize-none rounded-xl border border-border/70 bg-background px-3.5 py-3 text-sm',
                'text-foreground placeholder:text-muted-foreground/60',
                'transition-colors outline-none',
                'hover:border-border',
                'focus:border-ring focus:ring-2 focus:ring-ring/25',
              ].join(' ')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  {existingFeedback
                    ? <Edit3 className="mr-2 h-3.5 w-3.5" />
                    : <Send  className="mr-2 h-3.5 w-3.5" />
                  }
                  {existingFeedback ? 'Mettre à jour' : 'Envoyer mon avis'}
                </>
              )}
            </Button>
            {existingFeedback && submitted && (
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Retour
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}