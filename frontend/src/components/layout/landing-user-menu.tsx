'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Video,
} from 'lucide-react';

import { AvatarCustom } from '@/components/ui/avatar-custom';
import { useAuth } from '@/context/auth-context';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';
import { cn } from '@/lib/utils';

const menuItemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70';

export function LandingUserMenu() {
  const { token, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    let active = true;
    authService
      .getProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((err) => console.error('Landing profile load failed:', err));
    return () => {
      active = false;
    };
  }, [token]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = rootRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(window.innerWidth - 16, 256);
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      setMenuPos({
        top: rect.bottom + 8,
        left,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  if (!token) return null;

  const displayName = profile?.full_name?.trim() || 'Votre compte';

  return (
    <div className="relative isolate z-[210]" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'flex items-center gap-2 rounded-full p-1 pr-2 transition-colors',
          'ring-1 ring-border/70 hover:bg-secondary/60',
          open && 'bg-secondary/60'
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Fermer le menu compte' : 'Ouvrir le menu compte'}
      >
        <div className="relative">
          <AvatarCustom
            src={profile?.avatar_url}
            name={profile?.full_name || 'Utilisateur'}
            size="md"
            imagePositionY={profile?.avatar_offset_y}
            imageScale={profile?.avatar_scale}
          />
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && isMounted && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className="fixed z-[260] w-[min(calc(100vw-1rem),15rem)] overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-[0_10px_28px_hsl(var(--foreground)/0.09),0_26px_60px_-18px_hsl(var(--foreground)/0.24)] supports-[backdrop-filter]:bg-popover/98 supports-[backdrop-filter]:backdrop-blur-md"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <div className="pointer-events-none absolute -top-1.5 right-5 h-3 w-3 rotate-45 border-l border-t border-border/70 bg-popover supports-[backdrop-filter]:bg-popover/98" />
          <div className="mb-1 border-b border-border/60 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <AvatarCustom
                src={profile?.avatar_url}
                name={profile?.full_name || 'Utilisateur'}
                size="md"
              />
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                <Link
                  href="/settings"
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  Profil et préférences
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <Link href="/studio" role="menuitem" className={menuItemClass} onClick={() => setOpen(false)}>
              <Video className="h-4 w-4 text-primary" />
              Studio
            </Link>
            <Link
              href="/dashboard"
              role="menuitem"
              className={menuItemClass}
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-primary" />
              Tableau de bord
            </Link>
            <Link href="/history" role="menuitem" className={menuItemClass} onClick={() => setOpen(false)}>
              <History className="h-4 w-4 text-primary" />
              Historique
            </Link>
          </div>

          <div className="mt-1 border-t border-border/60 pt-1.5">
            <button
              type="button"
              role="menuitem"
              className={cn(menuItemClass, 'text-muted-foreground hover:text-foreground')}
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
