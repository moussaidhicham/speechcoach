'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Calendar,
  Check,
  Clock,
  History,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { videoService } from '@/services/video.service';
import { SessionHistory } from '@/types/analytics';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface HistoryItemProps {
  item:              SessionHistory;
  index:             number;
  editingTitleId:    string | null;
  newTitle:          string;
  setNewTitle:       React.Dispatch<React.SetStateAction<string>>;
  setEditingTitleId: React.Dispatch<React.SetStateAction<string | null>>;
  handleRename:      (sessionId: string) => Promise<void>;
  handleDelete:      (sessionId: string) => Promise<void>;
  isDeleting:        boolean;
  isRenaming:        boolean;
}

/* ─── Status helpers ─────────────────────────────────────────────────── */

const statusLabel: Record<string, string> = {
  completed:  'Terminé',
  failed:     'Échec',
  processing: 'En cours',
  pending:    'En attente',
};

function statusStyle(status: string) {
  if (status === 'completed')  return 'border-primary/20 bg-primary/10 text-primary';
  if (status === 'failed')     return 'border-destructive/20 bg-destructive/10 text-destructive';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400';
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function HistoryPage() {
  const [history,        setHistory]        = React.useState<SessionHistory[]>([]);
  const [loading,        setLoading]        = React.useState(true);
  const [isError,        setIsError]        = React.useState(false);
  const [searchQuery,    setSearchQuery]    = React.useState('');
  const [statusFilter,   setStatusFilter]   = React.useState('all');
  const [sortBy,         setSortBy]         = React.useState('newest');
  const [editingTitleId, setEditingTitleId] = React.useState<string | null>(null);
  const [newTitle,       setNewTitle]       = React.useState('');
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [pendingRenameId, setPendingRenameId] = React.useState<string | null>(null);

  const fetchHistory = React.useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      const data = await videoService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setIsError(true);
      toast.error("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Supprimer définitivement cette session ?')) return;
    setPendingDeleteId(sessionId);
    try {
      await videoService.deleteSession(sessionId);
      toast.success('Session supprimée.');
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete session:', err);
      toast.error('Erreur lors de la suppression.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleRename = async (sessionId: string) => {
    if (!newTitle.trim()) return;
    setPendingRenameId(sessionId);
    try {
      await videoService.updateSession(sessionId, { title: newTitle.trim() });
      toast.success('Titre mis à jour.');
      setEditingTitleId(null);
      fetchHistory();
    } catch (err) {
      console.error('Failed to rename session:', err);
      toast.error('Erreur lors du renommage.');
    } finally {
      setPendingRenameId(null);
    }
  };

  const filteredHistory = history
    .filter((item) => {
      const matchesSearch =
        (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.session_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest')     return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'score-high') return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === 'score-low')  return (a.overall_score || 0) - (b.overall_score || 0);
      return 0;
    });

  return (
    <AppShell
      title="Historique des analyses"
      subtitle="Retrouvez vos sessions, vos scores et vos exports."
      maxWidth="6xl"
    >
      <div className="space-y-5">

        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              aria-label="Rechercher une analyse"
              placeholder="Rechercher par titre ou identifiant…"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
              <SelectItem value="processing">En cours</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger aria-label="Trier les analyses">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Plus récent</SelectItem>
              <SelectItem value="oldest">Plus ancien</SelectItem>
              <SelectItem value="score-high">Meilleur score</SelectItem>
              <SelectItem value="score-low">Score le plus bas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Error ─────────────────────────────────────────────────── */}
        {isError && !loading && (
          <Card className="border-dashed" role="alert">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-lg font-medium">
                  Impossible de charger l'historique
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  La liste des analyses n'a pas pu être récupérée.
                  Vous pouvez relancer la requête sans quitter la page.
                </p>
              </div>
              <Button onClick={() => fetchHistory()} className="shrink-0">
                Recharger
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── List ──────────────────────────────────────────────────── */}
        {loading ? (
          <LoadingState />
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredHistory.map((item, index) => (
                <HistoryItem
                  key={item.session_id}
                  item={item}
                  index={index}
                  editingTitleId={editingTitleId}
                  newTitle={newTitle}
                  setNewTitle={setNewTitle}
                  setEditingTitleId={setEditingTitleId}
                  handleRename={handleRename}
                  handleDelete={handleDelete}
                  isDeleting={pendingDeleteId === item.session_id}
                  isRenaming={pendingRenameId === item.session_id}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSortBy('newest');
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ─── LoadingState ───────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

/* ─── HistoryItem ────────────────────────────────────────────────────── */

function HistoryItem({
  item,
  index,
  editingTitleId,
  newTitle,
  setNewTitle,
  setEditingTitleId,
  handleRename,
  handleDelete,
  isDeleting,
  isRenaming,
}: HistoryItemProps) {
  const duration  = item.duration || 0;
  const durationFmt = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: index * 0.03 }}
      layout
    >
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            {/* Left: icon + meta */}
            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                statusStyle(item.status)
              )}>
                <Video className="h-4 w-4" />
              </div>

              {/* Title + metadata */}
              <div className="min-w-0 space-y-2">
                {editingTitleId === item.session_id ? (
                  /* ── Rename inline ── */
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      aria-label="Renommer la session"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(item.session_id);
                        if (e.key === 'Escape') setEditingTitleId(null);
                      }}
                      className="min-w-[200px] flex-1"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                      onClick={() => handleRename(item.session_id)}
                      disabled={isRenaming}
                      aria-label="Valider le nouveau titre"
                    >
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                      onClick={() => setEditingTitleId(null)}
                      disabled={isRenaming}
                      aria-label="Annuler le renommage"
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ) : (
                  /* ── Title row ── */
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      className="font-display truncate text-left text-base font-medium text-foreground transition-colors hover:text-primary"
                      aria-label={`Renommer ${item.title || `la session ${item.session_id.slice(0, 8)}`}`}
                      onClick={() => {
                        setEditingTitleId(item.session_id);
                        setNewTitle(item.title || '');
                      }}
                    >
                      {item.title || `Session ${item.session_id.slice(0, 8)}`}
                    </button>
                    <Badge variant="outline" className={cn(
                      'text-xs',
                      item.status === 'completed' && 'border-primary/20 bg-primary/10 text-primary',
                      item.status === 'failed'    && 'border-destructive/20 bg-destructive/10 text-destructive',
                    )}>
                      {statusLabel[item.status] || item.status}
                    </Badge>
                  </div>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {durationFmt}
                  </span>
                  {item.wpm ? (
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="h-3 w-3" />
                      {item.wpm} WPM
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: score + actions */}
            <div className="flex items-center gap-2.5 lg:shrink-0">
              {item.status === 'completed' && (
                <div className="rounded-xl bg-primary/10 px-3.5 py-1.5 font-mono text-sm font-medium text-primary">
                  {item.overall_score}%
                </div>
              )}
              {item.status === 'completed' && (
                <Link href={`/report/${item.session_id}`}>
                  <Button size="sm" variant="outline">Rapport</Button>
                </Link>
              )}
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                onClick={() => handleDelete(item.session_id)}
                disabled={isDeleting}
                aria-label={`Supprimer ${item.title || `la session ${item.session_id.slice(0, 8)}`}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────────── */

function EmptyState({
  searchQuery,
  statusFilter,
  onClearFilters,
}: {
  searchQuery:    string;
  statusFilter:   string;
  onClearFilters: () => void;
}) {
  const hasFilters = Boolean(searchQuery) || statusFilter !== 'all';

  return (
    <div className="rounded-3xl border border-dashed border-border/60 bg-card/50 px-6 py-20 text-center">
      <History className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
      <h3 className="font-display text-xl font-medium">Aucune analyse trouvée</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {hasFilters
          ? 'Ajustez vos filtres pour retrouver une session.'
          : 'Commencez une première analyse depuis le studio.'}
      </p>
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href="/studio">
          <Button>
            <Video className="mr-1.5 h-4 w-4" />
            Aller au studio
          </Button>
        </Link>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Réinitialiser les filtres
          </Button>
        )}
      </div>
    </div>
  );
}