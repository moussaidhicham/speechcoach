
'use client';
 
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquareQuote,
  Mic,
  Settings,
  Video,
  X,
} from 'lucide-react';
 
import { AvatarCustom } from '@/components/ui/avatar-custom';
import { Button, buttonVariants } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/auth-context';
import { UserProfile } from '@/types/auth';
import { cn } from '@/lib/utils';
 
/* ─── Types ─────────────────────────────────────────────────────────── */
 
interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: '4xl' | '5xl' | '6xl' | '7xl';
  requireAuth?: boolean;
}
 
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
 
/* ─── Nav items ──────────────────────────────────────────────────────── */
 
const authenticatedNavItems: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',   icon: LayoutDashboard    },
  { href: '/studio',          label: 'Studio',       icon: Video              },
  { href: '/history',         label: 'Historique',   icon: History            },
  { href: '/public-feedback', label: 'Avis',         icon: MessageSquareQuote },
  { href: '/settings',        label: 'Paramètres',   icon: Settings           },
];
 
const publicNavItems: NavItem[] = [
  { href: '/',                label: 'Accueil',      icon: LayoutDashboard    },
  { href: '/public-feedback', label: 'Avis',         icon: MessageSquareQuote },
  { href: '/login',           label: 'Connexion',    icon: LogIn              },
];
 
/* ─── Shared nav link ────────────────────────────────────────────────── */
 
function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = pathname === item.href;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
      )}
    >
      <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
      {item.label}
    </Link>
  );
}
 
/* ─── User card (shared between sidebar & drawer) ────────────────────── */
 
function UserCard({
  profile,
  userEmail,
  onLogout,
  isAuthenticated,
  onLinkClick,
}: {
  profile: UserProfile | null;
  userEmail?: string;
  onLogout: () => void;
  isAuthenticated: boolean;
  onLinkClick?: () => void;
}) {
  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground">Accédez à vos rapports</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Connectez-vous pour retrouver vos analyses et votre progression.
          </div>
        </div>
        <Link
          href="/login"
          onClick={onLinkClick}
          className={cn(buttonVariants({ size: 'default' }), 'w-full')}
        >
          Se connecter
        </Link>
      </div>
    );
  }
 
  return (
    <>
      <div className="flex items-center gap-3">
        <AvatarCustom
          src={profile?.avatar_url}
          name={profile?.full_name || userEmail || 'Coach'}
          size="md"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {profile?.full_name || 'Coach Speech'}
          </div>
          <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="mt-4 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5 shrink-0" />
        Déconnexion
      </button>
    </>
  );
}
 
/* ─── Desktop sidebar ────────────────────────────────────────────────── */
 
function DesktopSidebar({
  items,
  pathname,
  profile,
  userEmail,
  onLogout,
  isAuthenticated,
}: {
  items: NavItem[];
  pathname: string;
  profile: UserProfile | null;
  userEmail?: string;
  onLogout: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <aside
      className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-card/80 px-4 py-5 backdrop-blur-md lg:flex"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <Link
        href={isAuthenticated ? '/dashboard' : '/'}
        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Mic className="h-4 w-4" />
        </div>
        <div>
          <div className="font-display text-base font-medium leading-tight">SpeechCoach</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace</div>
        </div>
      </Link>
 
      {/* Nav */}
      <nav className="mt-7 flex flex-col gap-0.5" aria-label="Navigation">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
 
      {/* User card */}
      <div className="mt-auto rounded-2xl border border-border/60 bg-background/70 p-4">
        <UserCard
          profile={profile}
          userEmail={userEmail}
          onLogout={onLogout}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </aside>
  );
}
 
/* ─── Mobile drawer ──────────────────────────────────────────────────── */
 
function MobileDrawer({
  items,
  pathname,
  profile,
  userEmail,
  onClose,
  onLogout,
  isAuthenticated,
}: {
  items: NavItem[];
  pathname: string;
  profile: UserProfile | null;
  userEmail?: string;
  onClose: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      >
        <motion.aside
          id="mobile-navigation"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full w-80 max-w-[88vw] flex-col border-r border-border/60 bg-background px-4 py-5 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              href={isAuthenticated ? '/dashboard' : '/'}
              className="flex items-center gap-3"
              onClick={onClose}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-medium">SpeechCoach</span>
            </Link>
            <button
              onClick={onClose}
              aria-label="Fermer le menu"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
 
          {/* Nav */}
          <nav className="mt-7 flex flex-col gap-0.5">
            {items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
            ))}
          </nav>
 
          {/* User card */}
          <div className="mt-auto rounded-2xl border border-border/60 bg-card/70 p-4">
            <UserCard
              profile={profile}
              userEmail={userEmail}
              onLogout={() => { onClose(); onLogout(); }}
              isAuthenticated={isAuthenticated}
              onLinkClick={onClose}
            />
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
 
/* ─── AppShell ───────────────────────────────────────────────────────── */
 
export function AppShell({
  title,
  subtitle,
  actions,
  children,
  maxWidth = '7xl',
  requireAuth = true,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, token, user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
 
  /* Hydrate profile */
  React.useEffect(() => {
    if (!token) { setProfile(null); return; }
    let active = true;
    authService
      .getProfile()
      .then((data) => { if (active) setProfile(data); })
      .catch((err) => console.error('Shell profile hydration failed:', err));
    return () => { active = false; };
  }, [token]);
 
  /* Auth guard */
  React.useEffect(() => {
    if (!isLoading && requireAuth && !token) router.replace('/login');
  }, [isLoading, requireAuth, router, token]);
 
  /* Close drawer on route change */
  React.useEffect(() => { setMobileOpen(false); }, [pathname]);
 
  /* Body scroll lock + Escape */
  React.useEffect(() => {
    if (!mobileOpen) { document.body.style.removeProperty('overflow'); return; }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.removeProperty('overflow');
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);
 
  const isAuthenticated = Boolean(token);
  const items = isAuthenticated ? authenticatedNavItems : publicNavItems;
 
  /* Auth redirect loading state */
  if (requireAuth && (isLoading || !token)) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        suppressHydrationWarning
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
          suppressHydrationWarning
        />
      </div>
    );
  }
 
  return (
    <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
 
      <DesktopSidebar
        items={items}
        pathname={pathname}
        profile={profile}
        userEmail={user?.email}
        onLogout={logout}
        isAuthenticated={isAuthenticated}
      />
 
      {mobileOpen && (
        <MobileDrawer
          items={items}
          pathname={pathname}
          profile={profile}
          userEmail={user?.email}
          onClose={() => setMobileOpen(false)}
          onLogout={logout}
          isAuthenticated={isAuthenticated}
        />
      )}
 
      <div className="min-h-screen lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
            {/* Mobile menu trigger */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
 
            {/* Title */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-medium leading-tight">{title}</h1>
              {subtitle && (
                <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
 
            {/* Page actions */}
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        </header>
 
        {/* Page content */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'mx-auto w-full px-4 py-7 sm:px-6 lg:px-8 lg:py-10',
            maxWidth === '4xl' && 'max-w-4xl',
            maxWidth === '5xl' && 'max-w-5xl',
            maxWidth === '6xl' && 'max-w-6xl',
            maxWidth === '7xl' && 'max-w-7xl'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
