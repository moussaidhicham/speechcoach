'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Send, RefreshCw, Trash2, Edit3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RatingStars } from '@/components/ui/rating-stars';
import api from '@/lib/api';

interface FeedbackFormProps {
  onSubmitted?: () => void;
  existingFeedback?: {
    id: string;
    rating: number;
    comments: string | null;
  } | null;
}

export function FeedbackForm({ onSubmitted, existingFeedback }: FeedbackFormProps) {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [comments, setComments] = useState(existingFeedback?.comments || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingFeedback) {
        await api.patch(`/feedback/platform/${existingFeedback.id}`, {
          rating,
          comments: comments.trim() || null,
        });
        toast.success("Votre avis a été mis à jour !");
      } else {
        await api.post('/feedback/platform', {
          rating,
          comments: comments.trim() || null,
        });
        toast.success("Merci pour votre retour !");
      }
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement du feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFeedback) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre avis ?")) return;

    setIsDeleting(true);
    try {
      await api.delete(`/feedback/platform/${existingFeedback.id}`);
      toast.success("Votre avis a été supprimé.");
      setRating(0);
      setComments('');
      setSubmitted(false);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (submitted && !existingFeedback) {
    return (
      <Card className="border-none shadow-lg bg-primary/5">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Merci !</CardTitle>
          <CardDescription className="max-w-[280px]">
            Votre avis a bien été enregistré. Il nous aide à améliorer SpeechCoach chaque jour.
          </CardDescription>
          <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
            Envoyer un autre avis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{existingFeedback ? "Modifier mon avis" : "Votre Avis Compte"}</CardTitle>
            <CardDescription>
              {existingFeedback 
                ? "Vous pouvez mettre à jour votre note et vos commentaires ci-dessous."
                : "Comment trouvez-vous votre expérience sur SpeechCoach ? Partagez vos idées d'amélioration."
              }
            </CardDescription>
          </div>
          {existingFeedback && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-3 pb-4 border-b">
            <Label className="text-base">Note globale</Label>
            <RatingStars rating={rating} onRatingChange={setRating} />
            <span className="text-sm font-medium text-muted-foreground">
              {rating === 1 && "Très déçu 😞"}
              {rating === 2 && "Déçu 🙁"}
              {rating === 3 && "Moyen 😐"}
              {rating === 4 && "Bien 🙂"}
              {rating === 5 && "Excellent ! 🤩"}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Commentaires (Optionnel)</Label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Qu'est-ce qu'on peut améliorer ? Qu'est-ce que vous aimez le plus ?"
              className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={isSubmitting || rating === 0}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {existingFeedback ? <Edit3 className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {existingFeedback ? "Mettre à jour" : "Envoyer mon avis"}
                </>
              )}
            </Button>
            {existingFeedback && submitted && (
               <Button variant="outline" onClick={() => setSubmitted(false)}>Retour</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
