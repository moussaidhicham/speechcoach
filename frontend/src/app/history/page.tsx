'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Play, AlertCircle, Clock, Search, 
  ChevronRight, Calendar, BarChart3, Trash2, Check, X, Video
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { videoService } from '@/services/video.service';
import { SessionHistory } from '@/types/analytics';

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = React.useState<SessionHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('newest');
  const [editingTitleId, setEditingTitleId] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  const fetchHistory = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await videoService.getHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast.error("Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette session ?")) return;
    try {
      await videoService.deleteSession(sessionId);
      toast.success("Session supprimée.");
      fetchHistory();
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleRename = async (sessionId: string) => {
    if (!newTitle.trim()) return;
    try {
      await videoService.updateSession(sessionId, { title: newTitle });
      toast.success("Titre mis à jour.");
      setEditingTitleId(null);
      fetchHistory();
    } catch (error) {
      toast.error("Erreur lors du renommage.");
    }
  };

  const filteredHistory = history
    .filter(item => {
      const matchesSearch = 
        (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.session_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'score-high') return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === 'score-low') return (a.overall_score || 0) - (b.overall_score || 0);
      return 0;
    });

  return (
    <div className="flex min-h-screen bg-muted/20" suppressHydrationWarning>
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <Header 
          title="Historique des Analyses" 
          subtitle={user?.email || ""}
        >
          <History className="w-5 h-5 text-primary" />
        </Header>

        <div className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par titre ou ID..." 
                className="pl-10 h-11 shadow-sm border-none bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-11 border-none shadow-sm bg-card">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-11 border-none shadow-sm bg-card">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récent</SelectItem>
                  <SelectItem value="oldest">Plus ancien</SelectItem>
                  <SelectItem value="score-high">Meilleur score</SelectItem>
                  <SelectItem value="score-low">Plus bas score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? <LoadingState /> : filteredHistory.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredHistory.map((item, index) => (
                  <HistoryItem 
                    key={item.session_id} 
                    item={item} 
                    index={index} 
                    mounted={mounted}
                    editingTitleId={editingTitleId}
                    newTitle={newTitle}
                    setNewTitle={setNewTitle}
                    setEditingTitleId={setEditingTitleId}
                    handleRename={handleRename}
                    handleDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : <EmptyState searchQuery={searchQuery} statusFilter={statusFilter} />}
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground animate-pulse">Chargement de vos analyses...</p>
    </div>
  );
}

function HistoryItem({ 
  item, index, mounted, editingTitleId, newTitle, setNewTitle, 
  setEditingTitleId, handleRename, handleDelete 
}: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} layout>
      <Card className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center p-4 md:p-6 gap-6">
            <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center shrink-0 shadow-inner", 
              item.status === 'completed' ? "bg-primary/5 text-primary" :
              item.status === 'failed' ? "bg-destructive/5 text-destructive" : "bg-amber-50 text-amber-600"
            )}>
               {item.status === 'completed' ? <Play className="w-6 h-6 fill-primary" /> : <AlertCircle className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                {editingTitleId === item.session_id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input className="h-8 py-0" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
                    <Button size="icon" variant="ghost" onClick={() => handleRename(item.session_id)}><Check className="w-4 h-4 text-emerald-600" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingTitleId(null)}><X className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold truncate text-lg group-hover:text-primary transition-colors cursor-pointer" onClick={() => { setEditingTitleId(item.session_id); setNewTitle(item.title || ""); }}>
                      {item.title || `Session #${item.session_id.split('-')[0]}`}
                    </span>
                    <Badge variant="outline">{item.status}</Badge>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {mounted ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}</span>
                {item.wpm && <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> {item.wpm} WPM</span>}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {item.status === 'completed' && <div className="text-2xl font-black text-primary">{item.overall_score}%</div>}
              <div className="flex items-center gap-2">
                {item.status === 'completed' && <Link href={`/report/${item.session_id}`}><Button size="sm" className="rounded-full px-6">Rapport</Button></Link>}
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.session_id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ searchQuery, statusFilter }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-3xl border border-dashed border-primary/20">
      <History className="w-12 h-12 text-primary/40 mb-4" />
      <h3 className="text-xl font-bold mb-2">Aucune analyse trouvée</h3>
      <p className="text-muted-foreground max-w-sm mb-8">
        {searchQuery || statusFilter !== 'all' ? "Ajustez vos filtres." : "Commencez votre première analyse dans le Studio."}
      </p>
      <Link href="/studio"><Button className="gap-2"><Video className="w-4 h-4" /> Aller au Studio</Button></Link>
    </div>
  );
}
